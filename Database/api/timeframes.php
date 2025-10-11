<?php
// --- Encabezados para CORS y para asegurar que la respuesta sea JSON ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Manejo de la solicitud 'pre-flight' de CORS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Configuración de errores (es útil para la depuración en desarrollo)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Desactivar en producción; los errores se manejarán en la respuesta JSON

// --- 1. Incluir tu archivo de conexión Aiven ---
// IMPORTANTE: Asegúrate de que esta ruta sea la correcta para tu archivo de conexión a Aiven.
require_once(__DIR__ . '/../Database/database.php'); 

// Si la conexión falló en el archivo requerido, $conn podría no estar definida.
if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(["message" => "Error interno del servidor: Fallo al conectar con Aiven."]);
    exit();
}

// --- 2. Lógica principal del script ---
$action = isset($_GET['action']) ? $_GET['action'] : '';

// 🛑 IMPORTANTE: La conexión a Aiven está en $conn, lista para ser usada.
if ($action === 'available_slots_by_date') {
    getAvailableSlotsByDate($conn);
} else {
    // Si la acción no es válida, devolvemos 400
    http_response_code(400); 
    echo json_encode(["message" => "Acción no válida o no especificada. Se esperaba 'available_slots_by_date'."]);
}


/**
 * Función que obtiene los horarios disponibles.
 *
 * @param mysqli $conn La conexión activa a la base de datos de Aiven.
 */
function getAvailableSlotsByDate($conn) {
    // -----------------------------------------------------------------
    // 1. VALIDACIÓN
    // -----------------------------------------------------------------
    $fecha = isset($_GET['fecha']) ? trim($_GET['fecha']) : null;
    if (!$fecha || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
        http_response_code(400); 
        echo json_encode(["message" => "El parámetro 'fecha' es requerido y debe tener formato YYYY-MM-DD."]);
        $conn->close(); // Cierra conexión antes de salir
        return;
    }

    // -----------------------------------------------------------------
    // 2. CONSULTA SEGURA (SENTENCIA PREPARADA)
    // -----------------------------------------------------------------
    $sql = "
        SELECT TIME_FORMAT(ts.start_time, '%H:%i') as horario 
        FROM time_slots ts
        WHERE ts.id NOT IN (
            SELECT r.time_id 
            FROM reservations r
            WHERE r.reservation_date = ? 
            AND r.reservation_status IN ('confirmed', 'pending')
        )
        ORDER BY ts.start_time ASC
    ";
    
    $stmt = $conn->prepare($sql);

    if ($stmt === false) {
        http_response_code(500); 
        // Mostrar $conn->error ayuda a depurar problemas de consulta.
        error_log("Error de SQL: " . $conn->error); 
        echo json_encode(["message" => "Error interno al procesar la consulta."]);
        $conn->close();
        return;
    }

    // Atamos el parámetro de la fecha (se usa 's' porque es un string de fecha)
    $stmt->bind_param("s", $fecha);

    $stmt->execute();
    
    $result = $stmt->get_result();
    
    $horarios = []; 
    
    // -----------------------------------------------------------------
    // 3. PROCESAMIENTO DE RESULTADOS Y RESPUESTA
    // -----------------------------------------------------------------
    while($row = $result->fetch_assoc()) {
        $horarios[] = $row['horario']; 
    }
    
    // Devolver el array JSON simple (como espera la mayoría de los front-ends)
    http_response_code(200); 
    echo json_encode($horarios); 

    $stmt->close();
    $conn->close(); // Cierra la conexión al finalizar exitosamente
}
?>