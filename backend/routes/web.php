<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json(['name' => 'UCYSSPass API', 'docs' => '/api']));
