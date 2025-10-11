<?php
// ====================================================
// reservas.php - SCRIPT PRINCIPAL DE LA API DE RESERVAS
// ¡Optimizado para el uso seguro de Aiven for MySQL!
// ====================================================

// ----------------------------------------------------
// 1. HEADERS DE CORS Y MANEJO DE OPTIONS
// ----------------------------------------------------
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");

// Manejo de preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuración de errores
error_reporting(E_ALL);
// CRÍTICO: Desactivar 'display_errors' en PRODUCCIÓN. Solo queremos loguearlos.
ini_set('display_errors', 0); 
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');

// Función para enviar una respuesta JSON de error (con intento de rollback/close)
function sendError($message, $statusCode = 400) {
    if (isset($GLOBALS['conn']) && $GLOBALS['conn']) {
        // Intento de rollback seguro
        if (property_exists($GLOBALS['conn'], 'in_transaction') && $GLOBALS['conn']->in_transaction) {
            @$GLOBALS['conn']->rollback();
        } else {
            @$GLOBALS['conn']->rollback();
        }
        // Intento de close seguro
        if (method_exists($GLOBALS['conn'], 'close')) {
            @$GLOBALS['conn']->close();
        }
    }

    // Mejora de seguridad: Evitar exponer errores internos de DB al usuario final
    if ($statusCode === 500 && strpos($message, 'Error SQL') !== false) {
        $message = "Error interno del servidor. Consulte los logs para más detalles.";
    }

    http_response_code($statusCode);
    echo json_encode(['success' => false, 'message' => $message]);
    exit();
}

// Función para enviar una respuesta JSON de éxito (y cerrar conexión)
function sendSuccess($data) {
    if (isset($GLOBALS['conn']) && $GLOBALS['conn']) {
        if (method_exists($GLOBALS['conn'], 'close')) {
            @$GLOBALS['conn']->close();
        }
    }
    http_response_code(200);
    echo json_encode(['success' => true, 'data' => $data]);
    exit();
}

// ----------------------------------------------------
// 2. CONEXIÓN A DB (Se asume que database.php tiene la config de Aiven)
// ----------------------------------------------------
require_once(__DIR__ . '/../Database/database.php');

$GLOBALS['conn'] = $conn;

// Verificación de la conexión
if (!isset($conn) || $conn->connect_error) {
    error_log("ERROR CRÍTICO: Error de conexión MySQL. Verifica database.php y la configuración de Aiven.");
    // No usamos sendError porque aún no tenemos una conexión válida para rollback, solo un error crítico.
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => "Error de conexión crítica a la base de datos."]);
    exit();
}

// Configurar charset
$conn->set_charset('utf8mb4');

// ----------------------------------------------------
// 3. MANEJO SEGÚN EL MÉTODO HTTP
// ----------------------------------------------------
switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        // ====================================================
        // CREACIÓN DE NUEVA RESERVA (MÉTODO POST)
        // LÓGICA: Ya utiliza transacciones y sentencias preparadas. Es segura.
        // ====================================================

        $input = file_get_contents("php://input");
        if (empty($input)) {
            sendError("Solicitud vacía. Asegúrate de enviar Content-Type: application/json y el cuerpo (body) de la solicitud.", 400);
        }

        $data = json_decode($input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            sendError("Error en el formato JSON recibido: " . json_last_error_msg(), 400);
        }

        // CRÍTICO: ELIMINAMOS la impresión de datos sensibles en el log si no es necesario para debug
        // error_log("Datos POST de reserva recibidos: " . print_r($data, true));

        // Validar campos requeridos
        $required_fields = ['user_id', 'mesa_id', 'hora', 'fecha', 'comensales'];
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '') ) {
                sendError("Campo requerido faltante o vacío: " . $field, 400);
            }
        }

        // Asignación y limpieza de variables
        $userId = intval($data['user_id']);
        $mesaId = intval($data['mesa_id']);
        $hora = trim($data['hora']);
        if (substr_count($hora, ':') === 1) {
            $hora .= ':00';
        }
        $fecha = trim($data['fecha']);
        $comensales = intval($data['comensales']);
        $status = isset($data['reservation_status']) ? $data['reservation_status'] : 'confirmed';

        // Validaciones de lógica de negocio
        if ($comensales < 1 || $comensales > 20) {
            sendError("Número de comensales inválido (debe ser entre 1 y 20).", 400);
        }
        $today = date('Y-m-d');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) || $fecha < $today) {
            sendError("Fecha inválida o anterior al día de hoy. Usa formato YYYY-MM-DD.", 400);
        }

        $conn->begin_transaction();

        try {
            // 5. Verificar que el usuario exista (Sentencia preparada)
            $stmt_user = $conn->prepare("SELECT id FROM users WHERE id = ?");
            if (!$stmt_user) throw new Exception("Error al preparar consulta de usuario: " . $conn->error);
            $stmt_user->bind_param("i", $userId);
            $stmt_user->execute();
            $res_user = $stmt_user->get_result();
            if ($res_user->num_rows === 0) {
                $stmt_user->close();
                throw new Exception("Usuario con ID {$userId} no encontrado.", 404);
            }
            $stmt_user->close();

            // 6. Verificar que la mesa exista y tenga capacidad (Sentencia preparada)
            $stmt_mesa = $conn->prepare("SELECT id, capacity FROM restaurants_table WHERE id = ?");
            if (!$stmt_mesa) throw new Exception("Error al preparar consulta de mesa: " . $conn->error);
            $stmt_mesa->bind_param("i", $mesaId);
            $stmt_mesa->execute();
            $result_mesa = $stmt_mesa->get_result();
            if ($result_mesa->num_rows === 0) {
                $stmt_mesa->close();
                throw new Exception("Mesa con ID {$mesaId} no encontrada.", 404);
            }
            $mesa_info = $result_mesa->fetch_assoc();
            if ($mesa_info['capacity'] < $comensales) {
                $stmt_mesa->close();
                throw new Exception("La mesa seleccionada no tiene capacidad suficiente ({$mesa_info['capacity']} plazas).", 400);
            }
            $stmt_mesa->close();

            // 7. Buscar el time_id basado en la hora (Sentencia preparada)
            $stmt_time = $conn->prepare("SELECT id FROM time_slots WHERE start_time = ?");
            if (!$stmt_time) throw new Exception("Error al preparar la consulta de time_id: " . $conn->error);
            $stmt_time->bind_param("s", $hora);
            $stmt_time->execute();
            $result_time = $stmt_time->get_result();

            if ($result_time->num_rows === 0) {
                $stmt_time->close();
                throw new Exception("La hora '{$hora}' no se encontró en time_slots. Verifica el formato (ej: '14:00:00') y la columna 'start_time'.", 400);
            }
            $timeRow = $result_time->fetch_assoc();
            $timeId = $timeRow['id'];
            $stmt_time->close();

            // 7.5. Verificar colisión de reserva (CRÍTICO - Sentencia preparada)
            $stmt_collision = $conn->prepare("SELECT id FROM reservations 
                WHERE table_id = ? AND reservation_date = ? AND time_id = ? 
                AND reservation_status IN ('confirmed', 'pending')");
            if (!$stmt_collision) throw new Exception("Error al preparar consulta de colisión: " . $conn->error);
            $stmt_collision->bind_param("isi", $mesaId, $fecha, $timeId);
            $stmt_collision->execute();
            $res_collision = $stmt_collision->get_result();
            if ($res_collision->num_rows > 0) {
                $stmt_collision->close();
                throw new Exception("La mesa {$mesaId} ya está reservada para la fecha {$fecha} a la hora {$hora}.", 409);
            }
            $stmt_collision->close();

            // 8. Insertar la reserva (Sentencia preparada)
            $sql = "INSERT INTO reservations (user_id, table_id, time_id, reservation_date, party_size, reservation_status) 
                VALUES (?, ?, ?, ?, ?, ?)";

            $stmt = $conn->prepare($sql);
            if (!$stmt) throw new Exception("Error al preparar la consulta SQL: " . $conn->error);

            // types: i i i s i s
            $stmt->bind_param("iiisis", $userId, $mesaId, $timeId, $fecha, $comensales, $status);

            if (!$stmt->execute()) {
                $errorMessage = $stmt->error;
                $stmt->close();
                error_log("Error SQL en inserción de reserva: " . $errorMessage);
                throw new Exception("Fallo en la inserción de la reserva. Error SQL: " . $errorMessage, 500);
            }

            $newReservationId = $conn->insert_id;
            $stmt->close();

            // 9. Opcional: Actualizar mesa a 'reserved' si la reserva es para hoy (Sentencia preparada)
            if ($fecha === $today) {
                $update_mesa = $conn->prepare("UPDATE restaurants_table SET table_status = 'reserved' WHERE id = ?");
                if ($update_mesa) {
                    $update_mesa->bind_param("i", $mesaId);
                    $update_mesa->execute();
                    $update_mesa->close();
                }
            }

            // Éxito: Commit de la transacción
            $conn->commit();

            sendSuccess([
                'message' => 'Reserva creada con éxito.',
                'reserva_id' => $newReservationId,
                'fecha' => $fecha,
                'hora' => $hora,
                'mesa_id' => $mesaId
            ]);

        } catch (Exception $e) {
            error_log("Excepción al procesar reserva: " . $e->getMessage() . " (Código: " . $e->getCode() . ")");
            // El rollback ya se maneja en sendError()
            $statusCode = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 500;
            sendError($e->getMessage(), $statusCode);
        }
        break;

    case 'GET':
        // ====================================================
        // OBTENER RESERVAS (MÉTODO GET)
        // LÓGICA: Ya utiliza sentencia preparada y bind dinámico. Es segura.
        // ====================================================
        $action = isset($_GET['action']) ? $_GET['action'] : '';
        $clienteId = isset($_GET['clienteId']) ? intval($_GET['clienteId']) : null;

        $isAdminView = ($action === 'all_reservations');

        if (!$clienteId && !$isAdminView) {
            sendError("Parámetro 'clienteId' o 'action=all_reservations' requerido para listar reservas.", 400);
        }

        $selectFields = "r.id, r.reservation_date as fecha, ts.start_time as horario, t.label as mesa, t.zone as zona, r.party_size as personas, r.reservation_status as estado, u.first_name as nombre_cliente, u.last_name as apellido_cliente";
        $joins = "FROM reservations r 
                     JOIN time_slots ts ON r.time_id = ts.id 
                     JOIN restaurants_table t ON r.table_id = t.id 
                     JOIN users u on r.user_id = u.id";
        $orderBy = "ORDER BY r.reservation_date DESC, ts.start_time ASC";

        $whereClause = "";
        $bindType = "";
        $bindParams = [];

        if (!$isAdminView) {
            $whereClause = "WHERE r.user_id = ? AND r.reservation_status IN ('confirmed', 'pending')";
            $bindType = "i";
            $bindParams = [$clienteId];
        }

        $sql = "SELECT {$selectFields} {$joins} {$whereClause} {$orderBy}";

        // error_log("DEBUG GET SQL: " . $sql); // Desactivar en producción si no es necesario

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            error_log("Error al preparar consulta de reservas: " . $conn->error);
            sendError("Error al preparar consulta de reservas: " . $conn->error, 500);
        }

        if (!empty($bindParams)) {
            // bind dinámico
            $stmt->bind_param($bindType, ...$bindParams);
        }

        if (!$stmt->execute()) {
            error_log("Error al ejecutar consulta de reservas: " . $stmt->error);
            sendError("Error al ejecutar la consulta SQL: " . $stmt->error, 500);
        }

        $result = $stmt->get_result();
        if ($conn->error) {
            error_log("Error de conexión/resultado después de get_result(): " . $conn->error);
            sendError("Error de base de datos al obtener resultados.", 500);
        }

        $reservas = [];
        while ($row = $result->fetch_assoc()) {
            $reservas[] = $row;
        }
        $stmt->close();

        // error_log("DEBUG: Se encontraron " . count($reservas) . " reservas."); // Desactivar en producción

        sendSuccess($reservas);
        break;

    case 'DELETE':
        // ====================================================
        // CANCELAR RESERVA (MÉTODO DELETE)
        // LÓGICA: Ya utiliza transacciones y sentencias preparadas. Es segura.
        // ====================================================
        $reservaId = isset($_GET['id']) ? intval($_GET['id']) : null;
        if (!$reservaId) {
            sendError("Parámetro 'id' requerido para cancelar reserva.", 400);
        }

        $conn->begin_transaction();

        try {
            // Obtener table_id y fecha antes de actualizar (Sentencia preparada)
            $stmt_table_id = $conn->prepare("SELECT table_id, reservation_date FROM reservations WHERE id = ? AND reservation_status = 'confirmed'");
            if (!$stmt_table_id) throw new Exception("Error al obtener table_id: " . $conn->error);
            $stmt_table_id->bind_param("i", $reservaId);
            $stmt_table_id->execute();
            $result_table = $stmt_table_id->get_result();
            if ($result_table->num_rows === 0) {
                $stmt_table_id->close();
                throw new Exception("Reserva no encontrada o ya cancelada.", 404);
            }
            $reserva_info = $result_table->fetch_assoc();
            $mesaId = $reserva_info['table_id'];
            $fechaReserva = $reserva_info['reservation_date'];
            $stmt_table_id->close();

            // 1. Actualizar status a 'cancelled' (Sentencia preparada)
            $sql = "UPDATE reservations SET reservation_status = 'cancelled' WHERE id = ? AND reservation_status = 'confirmed'";
            $stmt = $conn->prepare($sql);
            if (!$stmt) throw new Exception("Error al preparar consulta de cancelación: " . $conn->error);
            $stmt->bind_param("i", $reservaId);

            if ($stmt->execute() && $stmt->affected_rows > 0) {
                $stmt->close();

                // 2. Liberar mesa SOLO si era para hoy y no tiene otras reservas ACTIVAS para hoy (Sentencia preparada)
                $today = date('Y-m-d');
                if ($fechaReserva === $today) {
                    $stmt_check = $conn->prepare("SELECT COUNT(*) as cnt FROM reservations WHERE table_id = ? AND reservation_date = ? AND reservation_status = 'confirmed'");
                    if ($stmt_check) {
                        $stmt_check->bind_param("is", $mesaId, $today);
                        $stmt_check->execute();
                        $res_count = $stmt_check->get_result();
                        $count = 0;
                        if ($res_count) {
                            $row_count = $res_count->fetch_assoc();
                            $count = intval($row_count['cnt']);
                        }
                        $stmt_check->close();

                        if ($count == 0) {
                            $update_mesa = $conn->prepare("UPDATE restaurants_table SET table_status = 'available' WHERE id = ?");
                            if ($update_mesa) {
                                $update_mesa->bind_param("i", $mesaId);
                                $update_mesa->execute();
                                $update_mesa->close();
                            }
                        }
                    }
                }

                $conn->commit();
                sendSuccess(['message' => 'Reserva cancelada con éxito.']);

            } else {
                $stmt->close();
                throw new Exception("Error al cancelar la reserva.", 500);
            }

        } catch (Exception $e) {
            error_log("Excepción al procesar reserva: " . $e->getMessage() . " (Código: " . $e->getCode() . ")");
            // El rollback ya se maneja en sendError()
            $statusCode = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 500;
            sendError($e->getMessage(), $statusCode);
        }
        break;

    case 'PUT':
        // ====================================================
        // ACTUALIZACIÓN DE RESERVA EXISTENTE (MÉTODO PUT)
        // LÓGICA: Ya utiliza transacciones y sentencias preparadas. Es segura.
        // ====================================================
        $input = file_get_contents("php://input");
        if (empty($input)) {
            sendError("Solicitud vacía para PUT. Asegúrate de enviar Content-Type: application/json.", 400);
        }

        $data = json_decode($input, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            sendError("Error en el formato JSON recibido: " . json_last_error_msg(), 400);
        }

        // Validar campos requeridos para UPDATE (incluyendo ID de reserva)
        $required_fields = ['id', 'user_id', 'mesa_id', 'hora', 'fecha', 'comensales'];
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                sendError("Campo requerido faltante o vacío: " . $field . " para la actualización.", 400);
            }
        }

        // Asignación y limpieza de variables
        $reservaId = intval($data['id']);
        $userId = intval($data['user_id']);
        $mesaId = intval($data['mesa_id']);

        // Asegurar formato HH:MM:SS
        $hora = trim($data['hora']);
        if (substr_count($hora, ':') === 1) {
            $hora .= ':00';
        }

        $fecha = trim($data['fecha']);
        $comensales = intval($data['comensales']);
        $status = isset($data['reservation_status']) ? $data['reservation_status'] : 'confirmed';

        // Validaciones de lógica de negocio
        if ($comensales < 1 || $comensales > 20) {
            sendError("Número de comensales inválido (debe ser entre 1 y 20).", 400);
        }
        $today = date('Y-m-d');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) || $fecha < $today) {
            sendError("Fecha inválida o anterior al día de hoy. Usa formato YYYY-MM-DD.", 400);
        }

        $conn->begin_transaction();

        try {
            // 1. Verificar que la reserva exista (Sentencia preparada)
            $stmt_reserva = $conn->prepare("SELECT id FROM reservations WHERE id = ? AND user_id = ?");
            if (!$stmt_reserva) throw new Exception("Error al preparar consulta de reserva: " . $conn->error);
            $stmt_reserva->bind_param("ii", $reservaId, $userId);
            $stmt_reserva->execute();
            $res_check = $stmt_reserva->get_result();
            if ($res_check->num_rows === 0) {
                $stmt_reserva->close();
                throw new Exception("Reserva con ID {$reservaId} no encontrada para el usuario.", 404);
            }
            $stmt_reserva->close();

            // 2. Verificar que la mesa exista y tenga capacidad (Sentencia preparada)
            $stmt_mesa = $conn->prepare("SELECT id, capacity FROM restaurants_table WHERE id = ?");
            if (!$stmt_mesa) throw new Exception("Error al preparar consulta de mesa: " . $conn->error);
            $stmt_mesa->bind_param("i", $mesaId);
            $stmt_mesa->execute();
            $result_mesa = $stmt_mesa->get_result();
            if ($result_mesa->num_rows === 0) {
                $stmt_mesa->close();
                throw new Exception("Mesa con ID {$mesaId} no encontrada.", 404);
            }
            $mesa_info = $result_mesa->fetch_assoc();
            if ($mesa_info['capacity'] < $comensales) {
                $stmt_mesa->close();
                throw new Exception("La mesa seleccionada no tiene capacidad suficiente ({$mesa_info['capacity']} plazas).", 400);
            }
            $stmt_mesa->close();

            // 3. Buscar el time_id basado en la hora (Sentencia preparada)
            $stmt_time = $conn->prepare("SELECT id FROM time_slots WHERE start_time = ?");
            if (!$stmt_time) throw new Exception("Error al preparar la consulta de time_id: " . $conn->error);
            $stmt_time->bind_param("s", $hora);
            $stmt_time->execute();
            $result_time = $stmt_time->get_result();

            if ($result_time->num_rows === 0) {
                $stmt_time->close();
                throw new Exception("La hora '{$hora}' no se encontró en time_slots. Verifica el formato.", 400);
            }
            $timeRow = $result_time->fetch_assoc();
            $timeId = $timeRow['id'];
            $stmt_time->close();

            // 4. Verificar colisión de reserva (CRÍTICO - Sentencia preparada)
            $stmt_collision = $conn->prepare("SELECT id FROM reservations 
                WHERE table_id = ? AND reservation_date = ? AND time_id = ? 
                AND reservation_status IN ('confirmed', 'pending')
                AND id != ?");
            if (!$stmt_collision) throw new Exception("Error al preparar consulta de colisión: " . $conn->error);
            $stmt_collision->bind_param("isii", $mesaId, $fecha, $timeId, $reservaId);
            $stmt_collision->execute();
            $res_collision = $stmt_collision->get_result();
            if ($res_collision->num_rows > 0) {
                $stmt_collision->close();
                throw new Exception("La mesa {$mesaId} ya está reservada para la fecha {$fecha} a la hora {$hora} por otra persona.", 409);
            }
            $stmt_collision->close();

            // 5. Ejecutar la actualización (UPDATE - Sentencia preparada)
            $sql = "UPDATE reservations SET table_id = ?, time_id = ?, reservation_date = ?, party_size = ?, reservation_status = ?
                    WHERE id = ? AND user_id = ?";

            $stmt = $conn->prepare($sql);
            if (!$stmt) throw new Exception("Error al preparar la consulta SQL UPDATE: " . $conn->error);

            // types: i i s i s i i => "iisisii"
            $stmt->bind_param("iisisii", $mesaId, $timeId, $fecha, $comensales, $status, $reservaId, $userId);

            // error_log("DEBUG UPDATE: Mesa ID: {$mesaId}, Time ID: {$timeId}, Fecha: {$fecha}, Comensales: {$comensales}, Status: {$status}, Reserva ID: {$reservaId}, User ID: {$userId}"); // Desactivar en producción

            if (!$stmt->execute()) {
                $errorMessage = $stmt->error;
                $stmt->close();
                error_log("Error SQL en actualización de reserva: " . $errorMessage);
                throw new Exception("Fallo en la actualización de la reserva. Error SQL: " . $errorMessage, 500);
            }

            $stmt->close();
            $conn->commit();

            sendSuccess([
                'message' => 'Reserva actualizada con éxito.',
                'reserva_id' => $reservaId,
                'fecha' => $fecha
            ]);

        } catch (Exception $e) {
            error_log("Excepción al procesar actualización de reserva: " . $e->getMessage() . " (Código: " . $e->getCode() . ")");
            // El rollback ya se maneja en sendError()
            $statusCode = $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 500;
            sendError($e->getMessage(), $statusCode);
        }
        break;

    default:
        sendError("Método de solicitud no permitido: " . $_SERVER['REQUEST_METHOD'], 405);
        break;
}
?>