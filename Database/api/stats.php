<?php
// PHP API para obtener estadísticas diarias del restaurante.

// ----------------------------------------------------
// 1. CABECERAS CORS (ESENCIAL PARA COMUNICACIÓN ANGULAR)
// ----------------------------------------------------
header("Access-Control-Allow-Origin: *"); // Permite acceso desde cualquier origen
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header('Content-Type: application/json');

require_once('../Database/database.php'); // Asume que este archivo provee la conexión $conn

$method = $_SERVER['REQUEST_METHOD'];

// Manejo de la solicitud OPTIONS (preflight)
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método no permitido. Solo se acepta GET."]);
    exit();
}

try {
    // ----------------------------------------------------
    // CONSULTAS SQL UTILIZANDO LAS TABLAS ESPECÍFICAS DEL ESQUEMA
    // ----------------------------------------------------

    // 1. Total de Reservas Confirmadas de Hoy
    $stmt_reservas = $conn->prepare("
        SELECT COUNT(*) as count 
        FROM reservations 
        WHERE DATE(reservation_date) = CURDATE() 
        AND reservation_status = 'confirmed'
    ");
    $stmt_reservas->execute();
    $result_reservas = $stmt_reservas->get_result();
    $reservas_hoy = $result_reservas->fetch_assoc()['count'];
    $stmt_reservas->close();

    // 2. Mesas Totales (Usando 'restaurants_table')
    $stmt_total_mesas = $conn->prepare("SELECT COUNT(*) as total FROM restaurants_table");
    $stmt_total_mesas->execute();
    $result_total_mesas = $stmt_total_mesas->get_result();
    $total_mesas = $result_total_mesas->fetch_assoc()['total'];
    $stmt_total_mesas->close();

    // 3. Mesas Ocupadas Hoy (Contando mesas únicas con reserva confirmada)
    $stmt_mesas_ocupadas = $conn->prepare("
        SELECT COUNT(DISTINCT table_id) as occupied 
        FROM reservations 
        WHERE DATE(reservation_date) = CURDATE() 
        AND reservation_status = 'confirmed'
    ");
    $stmt_mesas_ocupadas->execute();
    $result_mesas_ocupadas = $stmt_mesas_ocupadas->get_result();
    $mesas_ocupadas = $result_mesas_ocupadas->fetch_assoc()['occupied'];
    $stmt_mesas_ocupadas->close();
    
    // Cálculo: Mesas Disponibles
    $mesas_disponibles = $total_mesas - $mesas_ocupadas;

    // 4. Reservas Pendientes de Hoy
    $stmt_pendientes = $conn->prepare("
        SELECT COUNT(*) as count 
        FROM reservations 
        WHERE DATE(reservation_date) = CURDATE() 
        AND reservation_status = 'pending'
    ");
    $stmt_pendientes->execute();
    $result_pendientes = $stmt_pendientes->get_result();
    $reservas_pendientes = $result_pendientes->fetch_assoc()['count'];
    $stmt_pendientes->close();

    // 5. Cálculo: Ocupación (Porcentaje)
    $ocupacion_porcentaje = ($total_mesas > 0) ? round(($mesas_ocupadas / $total_mesas) * 100) : 0;

    // ----------------------------------------------------
    // CONSTRUCCIÓN DE RESPUESTA JSON
    // ----------------------------------------------------
    $response = [
        "success" => true,
        "stats" => [
            "reservas_hoy" => (int)$reservas_hoy,
            "mesas_totales" => (int)$total_mesas,
            "mesas_ocupadas" => (int)$mesas_ocupadas,
            "mesas_disponibles" => (int)$mesas_disponibles,
            "reservas_pendientes" => (int)$reservas_pendientes,
            "ocupacion_porcentaje" => (int)$ocupacion_porcentaje
        ]
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error interno del servidor al obtener estadísticas: " . $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>
