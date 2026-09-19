<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Certificate of attendance</title>
<style>
  @page { margin: 0; }
  body { margin: 0; font-family: 'DejaVu Sans', sans-serif; color: #12263a; }
  .sheet { margin: 28px; padding: 26px 46px; border: 6px solid #12263a; height: 672px; text-align: center; position: relative; }
  .inner { border: 2px solid #e4623f; padding: 34px 20px; height: 556px; }
  .brand { font-size: 18px; letter-spacing: 8px; text-transform: uppercase; color: #e4623f; font-weight: bold; margin-top: 4px; }
  .society { font-size: 13px; color: #4b5563; margin-top: 6px; }
  h1 { font-size: 40px; margin: 50px 0 10px; letter-spacing: 3px; text-transform: uppercase; }
  .line { font-size: 15px; color: #4b5563; margin: 6px 0; }
  .name { font-size: 44px; font-weight: bold; margin: 22px 0 14px; }
  .event { font-size: 26px; font-weight: bold; margin: 14px 0 6px; }
  .when { font-size: 15px; color: #4b5563; margin-top: 4px; }
  .foot { position: absolute; left: 46px; right: 46px; bottom: 14px; font-size: 10px; color: #4b5563; }
  .number { font-family: 'DejaVu Sans Mono', monospace; letter-spacing: 1px; color: #12263a; font-weight: bold; }
</style>
</head>
<body>
<div class="sheet">
  <div class="inner">
    <div class="brand">{{ $brand }}</div>
    <div class="society">{{ $society }}</div>
    <h1>Certificate of attendance</h1>
    <div class="line">This is to certify that</div>
    <div class="name">{{ $name }}</div>
    <div class="line">attended</div>
    <div class="event">{{ $title }}</div>
    <div class="when">{{ $when }}@if ($where) &middot; {{ $where }}@endif</div>
    @if ($organiser)
      <div class="when">Organised by {{ $organiser }}</div>
    @endif
  </div>
  <div class="foot">
    Certificate no. <span class="number">{{ $number }}</span><br>
    Check that this certificate is genuine: {{ $verifyUrl }}
  </div>
</div>
</body>
</html>
