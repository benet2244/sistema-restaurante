<?php
require_once('../Database/database.php'); // ¡Debe definir $conn con la configuración SSL de Aiven!

// CORS & headers básicos
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

// Manejo preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$path = explode('/', $_SERVER['REQUEST_URI']);
$id = is_numeric(end($path)) ? (int)end($path) : null;

// Funciones de ejemplo (mantener o reemplazar por tu lógica real de autenticación)
function checkAuth() { return true; }
function isAdmin() { return true; }

// --- VERIFICACIÓN DE CONEXIÓN Y AUTORIZACIÓN ---
if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Error interno: Fallo en la conexión a la base de datos."]);
    exit();
}

if (!checkAuth()) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "No autorizado."]);
    $conn->close();
    exit();
}

// --- LÓGICA DE LA API (CRUD) ---
switch ($method) {
    case 'GET':
        $tableCols = "id, zone, capacity, table_status, label, notes";
        if ($id) {
            // GET por ID (ya es seguro con sentencia preparada)
            $stmt = $conn->prepare("SELECT $tableCols FROM restaurants_table WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $mesa = $result->fetch_assoc();
            $stmt->close();

            if ($mesa) {
                http_response_code(200);
                echo json_encode(["success" => true, "data" => $mesa]);
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "Mesa no encontrada."]);
            }
        } else {
            // GET ALL (Mejora: Usar sentencia preparada aunque no tenga parámetros para mayor consistencia)
            $stmt = $conn->prepare("SELECT $tableCols FROM restaurants_table ORDER BY id");
            $stmt->execute();
            $result = $stmt->get_result();
            
            $mesas = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
            
            $stmt->close(); // Cerrar el statement
            http_response_code(200);
            echo json_encode(["success" => true, "data" => $mesas]);
        }
        break;

    case 'POST':
        // Lógica de POST: Ya usa sentencia preparada y es segura.
        // ... (Tu código existente para POST) ...
        if (!isAdmin()) { /* ... (error code 403) ... */ break; }
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['capacity'], $data['zone'], $data['label'])) { /* ... (error code 400) ... */ break; }

        $zone = $data['zone'];
        $capacity = (int)$data['capacity'];
        $table_status = $data['table_status'] ?? 'available';
        $notes = $data['notes'] ?? '';
        $label = $data['label'];

        $stmt = $conn->prepare("INSERT INTO restaurants_table (zone, capacity, table_status, notes, label) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("sisss", $zone, $capacity, $table_status, $notes, $label);

        if ($stmt->execute()) {
            http_response_code(201);
            echo json_encode(["success" => true, "message" => "Mesa creada.", "id" => $conn->insert_id]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al crear mesa: " . $stmt->error]);
        }
        $stmt->close();
        break;

    case 'PUT':
        // Lógica de PUT: Ya usa sentencia preparada y es segura.
        // ... (Tu código existente para PUT) ...
        if (!isAdmin()) { /* ... (error code 403) ... */ break; }
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$id || empty($data)) { /* ... (error code 400) ... */ break; }

        $zone = $data['zone'] ?? null;
        $capacity = $data['capacity'] ?? null;
        $table_status = $data['table_status'] ?? null;
        $notes = $data['notes'] ?? null;
        $label = $data['label'] ?? null;

        $fields = [];
        $types = "";
        $values = [];

        if ($zone !== null) { $fields[] = "zone = ?"; $types .= "s"; $values[] = $zone; }
        if ($capacity !== null) { $fields[] = "capacity = ?"; $types .= "i"; $values[] = $capacity; }
        if ($table_status !== null) { $fields[] = "table_status = ?"; $types .= "s"; $values[] = $table_status; }
        if ($notes !== null) { $fields[] = "notes = ?"; $types .= "s"; $values[] = $notes; }
        if ($label !== null) { $fields[] = "label = ?"; $types .= "s"; $values[] = $label; }

        if (empty($fields)) { /* ... (error code 400) ... */ break; }

        $sql = "UPDATE restaurants_table SET " . implode(", ", $fields) . " WHERE id = ?";
        $types .= "i";
        $values[] = $id;

        $stmt = $conn->prepare($sql);
        // El uso de `...$values` para bind_param es excelente
        $stmt->bind_param($types, ...$values); 

        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(["success" => true, "message" => "Mesa con ID $id actualizada.", "affected_rows" => $stmt->affected_rows]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al actualizar mesa: " . $stmt->error]);
        }
        $stmt->close();
        break;

    case 'DELETE':
        // Lógica de DELETE: Ya usa sentencia preparada y es segura.
        // ... (Tu código existente para DELETE) ...
        if (!isAdmin()) { /* ... (error code 403) ... */ break; }
        if (!$id) { /* ... (error code 400) ... */ break; }

        $stmt = $conn->prepare("DELETE FROM restaurants_table WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                http_response_code(200);
                echo json_encode(["success" => true, "message" => "Mesa con ID $id eliminada."]);
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "message" => "No se encontró la mesa con ID $id."]);
            }
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Error al eliminar mesa: " . $stmt->error]);
        }
        $stmt->close();
        break;

    default:
        http_response_code(405);
        echo json_encode(["success" => false, "message" => "Método no permitido."]);
        break;
}

// Cierre de la conexión al finalizar
if (isset($conn) && $conn) $conn->close();
?>