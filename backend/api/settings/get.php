<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/response.php';
require_once __DIR__ . '/../../middleware/auth.php';

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    Response::error('Method not allowed', 405);
}

// Verify auth
$user = Auth::requireAuth();

if (!isset($_GET['key'])) {
    Response::error('Setting key is required');
}

$key = $_GET['key'];

try {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = :key");
    $stmt->execute(['key' => $key]);
    $setting = $stmt->fetch();
    
    if (!$setting) {
        Response::notFound('Setting not found');
    }
    
    Response::success(['key' => $key, 'value' => $setting['setting_value']], 'Setting retrieved');
    
} catch (PDOException $e) {
    Response::error('Failed to retrieve setting: ' . $e->getMessage(), 500);
}
