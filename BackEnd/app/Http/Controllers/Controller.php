<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class Controller
{
    public function success($data = [], $message = 'Success', $statusCode = 200)
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $data
        ], $statusCode);
    }

    public function error($message = 'An error occurred', $statusCode = 400, $code = null)
    {
        $response = [
            'success' => false,
            'error'   => $message
        ];
        if ($code) {
            $response['code'] = $code;
        }
        return response()->json($response, $statusCode);
    }

    public function unauthorized($message = 'Unauthorized')
    {
        return $this->error($message, 401);
    }

    public function forbidden($message = 'Forbidden')
    {
        return $this->error($message, 403);
    }

    public function notFound($message = 'Resource not found')
    {
        return $this->error($message, 404);
    }
}
