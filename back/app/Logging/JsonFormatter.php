<?php

namespace App\Logging;

use Monolog\Formatter\JsonFormatter as MonologJsonFormatter;

class JsonFormatter extends MonologJsonFormatter
{
    public function __construct()
    {
        parent::__construct(
            batchMode: false,
            appendNewline: true,
        );
        $this->setDateFormat('Y-m-d\TH:i:s.vP');
        $this->setJsonEncodeOptions(JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
