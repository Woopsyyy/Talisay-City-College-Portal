<?php


class Response {
    public static function json($data, $statusCode = 200) {
        http_response_code($statusCode);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function success($data = [], $message = 'Success', $statusCode = 200) {
        $response = [
            'success' => true,
            'message' => $message,
            'data'    => $data
        ];
        self::json($response, $statusCode);
    }

    public static function error($message = 'An error occurred', $statusCode = 400, $code = null) {
        $response = [
            'success' => false,
            'error'   => $message
        ];
        if ($code) {
            $response['code'] = $code;
        }
        self::json($response, $statusCode);
    }

    public static function validationError($errors) {
        $response = [
            'success' => false,
            'error'   => 'Validation failed',
            'details' => $errors
        ];
        self::json($response, 422);
    }

    public static function unauthorized($message = 'Unauthorized') {
        self::error($message, 401);
    }

    public static function forbidden($message = 'Forbidden') {
        self::error($message, 403);
    }

    public static function notFound($message = 'Resource not found') {
        self::error($message, 404);
    }

    public static function methodNotAllowed() {
        self::error('Method not allowed', 405);
    }
}
?>
