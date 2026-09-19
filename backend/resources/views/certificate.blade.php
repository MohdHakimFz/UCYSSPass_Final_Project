<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Certificate of attendance</title>
<style>
  @page { margin: 0; }
  body { margin: 0; font-family: 'DejaVu Serif', serif; color: #14181f; background: #fbf9f4; }

  /* Frame: a heavy outer rule, a thin accent rule, and a square at each corner */
  .frame { position: absolute; left: 22px; top: 22px; right: 22px; bottom: 22px; border: 7px solid #14181f; }
  .rule { position: absolute; left: 36px; top: 36px; right: 36px; bottom: 36px; border: 1.5px solid #e4623f; }
  .corner { position: absolute; width: 22px; height: 22px; background: #e4623f; border: 4px solid #fbf9f4; }
  .tl { left: 26px; top: 26px; } .tr { right: 26px; top: 26px; }
  .bl { left: 26px; bottom: 26px; } .br { right: 26px; bottom: 26px; }

  .band { position: absolute; left: 36px; right: 36px; top: 36px; height: 78px; background: #14181f; }
  .band table { width: 100%; height: 78px; }
  .brand { font-family: 'DejaVu Sans', sans-serif; color: #fbf9f4; font-size: 26px; font-weight: bold; letter-spacing: 9px; padding-left: 40px; }
  .society { font-family: 'DejaVu Sans', sans-serif; color: #b4bdc8; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; text-align: right; padding-right: 40px; }

  .body { position: absolute; left: 60px; right: 60px; top: 140px; text-align: center; }
  .kicker { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; letter-spacing: 6px; text-transform: uppercase; color: #e4623f; font-weight: bold; }
  h1 { font-size: 38px; font-weight: normal; letter-spacing: 4px; text-transform: uppercase; margin: 10px 0 4px; }
  .divider { width: 120px; height: 3px; background: #e4623f; margin: 10px auto 18px; }
  .line { font-size: 13px; color: #4b5563; font-style: italic; margin: 4px 0; }
  .name { font-size: 42px; font-weight: bold; margin: 12px 40px 6px; padding-bottom: 8px; border-bottom: 1px solid #14181f; }
  .event { font-size: 24px; font-weight: bold; margin: 10px 0 6px; }
  .when { font-family: 'DejaVu Sans', sans-serif; font-size: 12px; color: #4b5563; margin-top: 3px; letter-spacing: 1px; }

  /* Signature and seal */
  .sign { position: absolute; left: 90px; right: 90px; bottom: 108px; }
  .sign table { width: 100%; }
  .sign td { text-align: center; vertical-align: bottom; }
  .sigline { border-top: 1px solid #14181f; width: 210px; margin: 0 auto; padding-top: 5px; font-family: 'DejaVu Sans', sans-serif; font-size: 10px; letter-spacing: 1px; color: #4b5563; }
  .signame { font-size: 15px; font-style: italic; height: 24px; }
  .seal { width: 92px; height: 92px; border-radius: 46px; background: #e4623f; margin: 0 auto; }
  .seal-ring { width: 80px; height: 80px; border-radius: 40px; border: 2px solid #fbf9f4; margin: 0 auto; position: relative; top: 4px; }
  .seal-text { font-family: 'DejaVu Sans', sans-serif; color: #fbf9f4; text-align: center; font-weight: bold; font-size: 15px; letter-spacing: 2px; padding-top: 22px; }
  .seal-sub { font-family: 'DejaVu Sans', sans-serif; color: #fbf9f4; text-align: center; font-size: 7px; letter-spacing: 2px; margin-top: 3px; }

  .foot { position: absolute; left: 60px; right: 60px; bottom: 50px; text-align: center; font-family: 'DejaVu Sans', sans-serif; font-size: 8.5px; color: #4b5563; line-height: 1.6; }
  .number { font-family: 'DejaVu Sans Mono', monospace; font-weight: bold; color: #14181f; letter-spacing: 1px; }
</style>
</head>
<body>
<div class="frame"></div>
<div class="rule"></div>
<div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>

<div class="band">
  <table><tr>
    <td class="brand">{{ $brand }}</td>
    <td class="society">{{ $society }}</td>
  </tr></table>
</div>

<div class="body">
  <div class="kicker">Certificate</div>
  <h1>of Attendance</h1>
  <div class="divider"></div>
  <div class="line">This is to certify that</div>
  <div class="name">{{ $name }}</div>
  <div class="line">attended</div>
  <div class="event">{{ $title }}</div>
  <div class="when">{{ $when }}@if ($where) &nbsp;&bull;&nbsp; {{ $where }}@endif</div>
  @if ($organiser)
    <div class="when">Organised by {{ $organiser }}</div>
  @endif
</div>

<div class="sign">
  <table><tr>
    <td style="width: 34%;">
      <div class="signame">{{ $organiser }}</div>
      <div class="sigline">EVENT ORGANISER</div>
    </td>
    <td style="width: 32%;">
      <div class="seal"><div class="seal-ring"><div class="seal-text">{{ $brand }}</div><div class="seal-sub">VERIFIED</div></div></div>
    </td>
    <td style="width: 34%;">
      <div class="signame">{{ $issued }}</div>
      <div class="sigline">DATE ISSUED</div>
    </td>
  </tr></table>
</div>

<div class="foot">
  Certificate no. <span class="number">{{ $number }}</span><br>
  Check that this certificate is genuine: {{ $verifyUrl }}
</div>
</body>
</html>
