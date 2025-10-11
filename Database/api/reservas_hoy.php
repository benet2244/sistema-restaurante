<?php
// ====================================================
// reservas_hoy.php - Obtiene todas las reservas para la fecha actual usando Aiven
// ====================================================

// ----------------------------------------------------
// 1. HEADERS DE CORS Y MANEJO DE OPTIONS
// ----------------------------------------------------
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Max-Age: 3600"); 

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuración de errores
error_reporting(E_ALL);
ini_set('display_errors', 1); 
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log'); 

// Función para enviar una respuesta JSON de error y cerrar conexión
function sendError($message, $statusCode = 400) {
    // Usamos $GLOBALS['conn'] si la variable de conexión es global
    if (isset($GLOBALS['conn']) && $GLOBALS['conn'] && method_exists($GLOBALS['conn'], 'close')) {
        $GLOBALS['conn']->close();
    }
    http_response_code($statusCode);
    echo json_encode(['success' => false, 'message' => $message]);
    exit();
}

// Función para enviar una respuesta JSON de éxito y cerrar conexión
function sendSuccess($data) {
    if (isset($GLOBALS['conn']) && $GLOBALS['conn'] && method_exists($GLOBALS['conn'], 'close')) {
        $GLOBALS['conn']->close();
    }
    http_response_code(200);
    echo json_encode(['success' => true, 'data' => $data]);
    exit();
}

// ----------------------------------------------------
// 2. CONEXIÓN A DB (Usando la configuración de Aiven)
// ----------------------------------------------------
// IMPORTANTE: Cambia 'database_aiven.php' por el nombre y ruta CORRECTA de tu archivo de conexión.
// Este archivo YA establece la variable $conn
require_once(__DIR__ . '/database_aiven.php'); 

$GLOBALS['conn'] = $conn; // Hacemos la variable de conexión global para las funciones sendError/sendSuccess

// Verificar la conexión establecida por el script de Aiven
// Si el script de Aiven falló, ya habrá ejecutado un die(), pero verificamos el objeto por si acaso.
if ($conn->connect_error) {
    error_log("Error de conexión MySQL: " . $conn->connect_error);
    sendError("Error de conexión a la base de datos.", 500);
}

// El charset se establece mejor en la conexión, pero aquí se asegura para evitar problemas.
$conn->set_charset('utf8mb4');

// ----------------------------------------------------
// 3. OBTENER RESERVAS DEL DÍA (MÉTODO GET)
// ----------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    $today = date('Y-m-d');
    $fecha_a_buscar = isset($_GET['date']) ? $_GET['date'] : $today;
    
    // El resto del código de la API es PERFECTO y usa sentencias preparadas
    $sql = "SELECT 
            r.id, 
            r.party_size AS personas, 
            r.reservation_status AS estado, 
            u.first_name AS nombre_cliente, 
            u.last_name AS apellido_cliente,
            t.label AS mesa, 
            ts.start_time AS hora_reserva
        FROM reservations r 
        JOIN time_slots ts ON r.time_id = ts.id 
        JOIN restaurants_table t ON r.table_id = t.id
        JOIN users u ON r.user_id = u.id 
        WHERE r.reservation_date = ? 
        AND r.reservation_status IN ('confirmed', 'pending')
        ORDER BY ts.start_time ASC";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        error_log("Error al preparar consulta de reservas del día: " . $conn->error);
        // Usamos $conn->error para obtener el error específico de MySQL
        sendError("Error al preparar consulta de reservas del día.", 500); 
    }
    
    // El uso de bind_param("s", ...) es correcto y seguro
    $stmt->bind_param("s", $fecha_a_buscar);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $reservas = [];
    while ($row = $result->fetch_assoc()) {
        $reservas[] = $row;
    }
    $stmt->close();
    
    sendSuccess($reservas);
    
} else {
    sendError("Método de solicitud no permitido: " . $_SERVER['REQUEST_METHOD'], 405);
}
?>