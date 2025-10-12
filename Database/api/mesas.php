<?php
require_once('../Database/database.php');

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

// --- OBTENCIÓN DEL ID ---
// Se prioriza el parámetro 'id' de la query string, que es lo que usa el frontend de Angular.
$id = null;
if (isset($_GET['id']) && is_numeric($_GET['id'])) {
    $id = (int)$_GET['id'];
} else {
    // Se mantiene el soporte para IDs en la ruta por si se usa en otro lugar.
    $path = explode('/', $_SERVER['REQUEST_URI']);
    if (is_numeric(end($path))) {
        $id = (int)end($path);
    }
}

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
            $stmt = $conn->prepare("SELECT $tableCols FROM restaurants_table ORDER BY id");
            $stmt->execute();
            $result = $stmt->get_result();
            $mesas = $result ? $result->fetch_all(MYSQLI_ASSOC) : [];
            $stmt->close();
            http_response_code(200);
            echo json_encode(["success" => true, "data" => $mesas]);
        }
        break;

    case 'POST':
        if (!isAdmin()) { http_response_code(403); echo json_encode(["success" => false, "message" => "Permisos insuficientes."]); break; }
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['capacity'], $data['zone'], $data['label'])) { http_response_code(400); echo json_encode(["success" => false, "message" => "Datos incompletos."]); break; }

        $stmt = $conn->prepare("INSERT INTO restaurants_table (zone, capacity, table_status, notes, label) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("sisss", $data['zone'], $data['capacity'], $data['table_status'], $data['notes'], $data['label']);

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
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$id || empty($data)) { http_response_code(400); echo json_encode(["success" => false, "message" => "ID de mesa no especificado o datos vacíos."]); break; }
        if (!isAdmin()) { http_response_code(403); echo json_encode(["success" => false, "message" => "Permisos insuficientes."]); break; }

        $fields = [];
        $types = "";
        $values = [];

        // Construcción dinámica de la consulta
        if (isset($data['zone'])) { $fields[] = "zone = ?"; $types .= "s"; $values[] = $data['zone']; }
        if (isset($data['capacity'])) { $fields[] = "capacity = ?"; $types .= "i"; $values[] = $data['capacity']; }
        if (isset($data['table_status'])) { $fields[] = "table_status = ?"; $types .= "s"; $values[] = $data['table_status']; }
        if (isset($data['notes'])) { $fields[] = "notes = ?"; $types .= "s"; $values[] = $data['notes']; }
        if (isset($data['label'])) { $fields[] = "label = ?"; $types .= "s"; $values[] = $data['label']; }

        if (empty($fields)) { http_response_code(400); echo json_encode(["success" => false, "message" => "No hay campos para actualizar."]); break; }

        $sql = "UPDATE restaurants_table SET " . implode(", ", $fields) . " WHERE id = ?";
        $types .= "i";
        $values[] = $id;

        $stmt = $conn->prepare($sql);
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
        if (!$id) { http_response_code(400); echo json_encode(["success" => false, "message" => "ID de mesa no especificado."]); break; }
        if (!isAdmin()) { http_response_code(403); echo json_encode(["success" => false, "message" => "Permisos insuficientes."]); break; }

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