<?php
require_once('../Database/database.php'); // Conecta a la base de datos

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Permite el acceso desde cualquier origen
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// =======================================================
// ENDPOINT: OBTENER MESAS REALMENTE DISPONIBLES
// =======================================================

// Verificamos si es una petición OPTIONS (pre-flight) y respondemos adecuadamente
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Obtener los parámetros de la URL
$fecha = isset($_GET['fecha']) ? $_GET['fecha'] : null;
$horario = isset($_GET['horario']) ? $_GET['horario'] : null;
$personas = isset($_GET['personas']) ? (int)$_GET['personas'] : null;
$zona = isset($_GET['zona']) ? $_GET['zona'] : null;

// 2. Validar que todos los parámetros necesarios están presentes
if (!$fecha || !$horario || !$personas || !$zona) {
    http_response_code(400); // Bad Request
    echo json_encode(['status' => 'error', 'message' => 'Faltan parámetros requeridos (fecha, horario, personas, zona).']);
    exit();
}

// 3. Consulta SQL para encontrar mesas disponibles
// La consulta busca mesas que:
//   - Estén en la zona solicitada.
//   - Tengan capacidad suficiente.
//   - Su estado general sea 'available'.
//   - Y, lo más importante, NO estén en la lista de mesas reservadas para esa fecha y hora.
$sql = "SELECT m.id, m.label, m.capacity, m.zone
        FROM mesas m
        WHERE m.zone = ? 
          AND m.capacity >= ?
          AND m.table_status = 'available'
          AND m.id NOT IN (
              SELECT r.mesa_id 
              FROM reservas r 
              WHERE r.fecha = ? 
                AND r.horario = ?
                AND r.reservation_status = 'confirmed'
          )";

// 4. Preparar y ejecutar la consulta de forma segura
$stmt = $conn->prepare($sql);
if ($stmt === false) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Error al preparar la consulta: ' . $conn->error]);
    exit();
}

// "siss" significa que estamos pasando un string, un integer, un string y un string
$stmt->bind_param("siss", $zona, $personas, $fecha, $horario);
$stmt->execute();
$result = $stmt->get_result();

// 5. Construir el array de resultados
$mesas = [];
while ($row = $result->fetch_assoc()) {
    $mesas[] = $row;
}

// 6. Cerrar statement y conexión
$stmt->close();
$conn->close();

// 7. Devolver el resultado como JSON
http_response_code(200);
echo json_encode($mesas);
?>
