<?php

require_once __DIR__ . '/../config/constants.php';

class Validator {
    private $errors = [];
    private $data;

    public function __construct($data) {
        $this->data = $data;
    }

    public function validate($rules) {
        foreach ($rules as $field => $ruleString) {
            $ruleSet = explode('|', $ruleString);
            foreach ($ruleSet as $rule) {
                
                $params = [];
                if (strpos($rule, ':') !== false) {
                    list($rule, $paramStr) = explode(':', $rule);
                    $params = explode(',', $paramStr);
                }

                $value = $this->data[$field] ?? null;

                
                if ($rule === 'required' && (is_null($value) || $value === '')) {
                    $this->addError($field, "$field is required");
                    continue;
                }

                
                if ($rule !== 'required' && (is_null($value) || $value === '')) {
                    continue;
                }

                switch ($rule) {
                    case 'string':
                        if (!is_string($value)) $this->addError($field, "$field must be a string");
                        break;
                    case 'integer':
                        if (!filter_var($value, FILTER_VALIDATE_INT)) $this->addError($field, "$field must be an integer");
                        break;
                    case 'email':
                        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) $this->addError($field, "$field must be a valid email");
                        break;
                    case 'min':
                        if (strlen($value) < $params[0]) $this->addError($field, "$field must be at least {$params[0]} characters");
                        break;
                    case 'max':
                        if (strlen($value) > $params[0]) $this->addError($field, "$field must not exceed {$params[0]} characters");
                        break;
                    case 'in':
                        if (!in_array($value, $params)) $this->addError($field, "$field must be one of: " . implode(', ', $params));
                        break;
                    case 'username':
                        if (!preg_match('/^[a-zA-Z0-9_]{3,30}$/', $value)) $this->addError($field, "$field must be alphanumeric with underscores (3-30 chars)");
                        break;
                    case 'password_strength':
                         
                        if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W_]{8,}$/', $value)) {
                            
                            
                        }
                        break;
                    case 'date':
                        $d = DateTime::createFromFormat('Y-m-d', $value);
                        if (!($d && $d->format('Y-m-d') === $value)) $this->addError($field, "$field must be a valid date (YYYY-MM-DD)");
                        break;
                }
            }
        }

        return empty($this->errors);
    }

    public function errors() {
        return $this->errors;
    }

    private function addError($field, $message) {
        if (!isset($this->errors[$field])) {
            $this->errors[$field] = [];
        }
        $this->errors[$field][] = $message;
    }

    public static function sanitize($input) {
        if (is_array($input)) {
            return array_map([self::class, 'sanitize'], $input);
        }
        return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
    }
}
?>
