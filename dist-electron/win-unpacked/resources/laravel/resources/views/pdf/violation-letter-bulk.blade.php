<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Attendance Violation Notices</title>
    <style>
        @page { size: auto; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            line-height: 1.5;
            color: #1e293b;
            background: white;
            margin: 25.4mm;
        }

        .letter-page {
            page-break-after: always;
        }
        .letter-page:last-child { page-break-after: avoid; }

        /* ── Letter title ── */
        .letter-title {
            text-align: center;
            font-size: 12pt;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin: 10px 0 10px;
            color: #0f172a;
        }

        /* ── Employee info block ── */
        .info-block {
            border: 1px solid #e2e8f0;
            border-radius: 3px;
            padding: 7px 10px;
            margin-bottom: 10px;
            background: #f8fafc;
            font-size: 9.5pt;
        }
        .info-grid { display: table; width: 100%; }
        .info-row  { display: table-row; }
        .info-label { display: table-cell; width: 110px; font-weight: 700; padding: 1.5px 0; color: #475569; }
        .info-value { display: table-cell; padding: 1.5px 0; }

        hr { border: 0; border-top: 1px solid #cbd5e1; margin: 8px 0; }

        /* ── Body text ── */
        .body-text { font-size: 9.5pt; line-height: 1.55; margin-bottom: 8px; text-align: justify; }

        /* ── Summary chips ── */
        .summary-row { margin-bottom: 10px; }
        .chip {
            display: inline-block;
            border: 1px solid #cbd5e1;
            border-radius: 3px;
            padding: 2px 7px;
            font-size: 8.5pt;
            margin-right: 5px;
            background: #fff;
        }
        .chip-val { font-weight: 700; color: #dc2626; }

        /* ── Section headings ── */
        .section-heading {
            font-size: 9.5pt;
            font-weight: 700;
            margin: 10px 0 4px;
            padding-bottom: 2px;
            border-bottom: 1px solid #cbd5e1;
            color: #0f172a;
        }

        /* ── Evidence table ── */
        .ev-table { width: auto; border-collapse: collapse; font-size: 8pt; margin-bottom: 8px; }
        .ev-table th {
            background: #1e3a8a;
            color: #fff;
            font-weight: 700;
            padding: 3px 6px;
            text-align: left;
            font-size: 7.5pt;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            white-space: nowrap;
        }
        .ev-table td { padding: 3px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .ev-table tbody tr:nth-child(even) td { background: #f8fafc; }
        .miss { color: #dc2626; font-weight: 700; }

        /* ── Action required ── */
        .action-box {
            border: 1px solid #cbd5e1;
            border-radius: 3px;
            padding: 7px 10px;
            font-size: 9.5pt;
            margin-bottom: 8px;
            background: #fefce8;
        }
        .action-box ol { margin-left: 18px; margin-top: 5px; }
        .action-box li { margin-bottom: 3px; }

        .closing { font-size: 9.5pt; line-height: 1.55; text-align: justify; margin-bottom: 8px; }

        /* ── Signatures ── */
        .sig-section { margin-top: 18px; }
        .sig-row { display: table; width: 100%; }
        .sig-col { display: table-cell; width: 50%; vertical-align: bottom; padding-right: 20px; }
        .sig-line { border-bottom: 1px solid #64748b; width: 200px; margin-top: 26px; margin-bottom: 3px; }
        .sig-name { font-weight: 700; font-size: 9.5pt; }
        .sig-sub  { font-size: 8.5pt; color: #475569; }
    </style>
</head>
<body>

@foreach($employees as $emp)
@php $v = $emp['violations']; $s = $emp['summary']; @endphp
<div class="letter-page">

    {{-- Letter title --}}
    <div class="letter-title">Notice of Attendance Violations</div>

    {{-- Employee info block --}}
    <div class="info-block">
        <div class="info-grid">
            <div class="info-row"><div class="info-label">Employee Name:</div><div class="info-value">{{ $emp['employee']['name'] }}</div></div>
            <div class="info-row"><div class="info-label">Employee Code:</div><div class="info-value">{{ $emp['employee']['code'] }}</div></div>
            <div class="info-row"><div class="info-label">Department:</div><div class="info-value">{{ $emp['employee']['department'] }}</div></div>
            <div class="info-row"><div class="info-label">Period Covered:</div><div class="info-value">{{ $emp['dateRange']['startFormatted'] }} to {{ $emp['dateRange']['endFormatted'] }}</div></div>
            <div class="info-row"><div class="info-label">Date Issued:</div><div class="info-value">{{ $emp['currentDate'] }}</div></div>
        </div>
    </div>

    <hr>

    {{-- Opening paragraph --}}
    <p class="body-text">This memorandum is issued to formally notify you of attendance irregularities recorded during the covered period stated below.</p>

    {{-- Policy paragraph --}}
    <p class="body-text">As provided in the company's attendance policy, employees are expected to observe proper working hours, maintain punctuality, and complete all required daily time logs. The official start time is {{ $emp['scheduleStartTime'] }}.</p>

    {{-- Summary chips --}}
    <div class="summary-row">
        @if($s['totalAbsences'] > 0)
            <span class="chip">Absences: <span class="chip-val">{{ $s['totalAbsences'] }}</span></span>
        @endif
        @if($s['totalLateAM'] > 0)
            <span class="chip">Late AM: <span class="chip-val">{{ $s['totalLateAM'] }}</span></span>
        @endif
        @if($s['totalLatePM'] > 0)
            <span class="chip">Late PM: <span class="chip-val">{{ $s['totalLatePM'] }}</span></span>
        @endif
        @if($s['totalMissedLogs'] > 0)
            <span class="chip">Missing Logs: <span class="chip-val">{{ $s['totalMissedLogs'] }}</span></span>
        @endif
        @if(($s['totalUndertime'] ?? 0) > 0)
            <span class="chip">Undertime: <span class="chip-val">{{ $s['totalUndertime'] }}</span></span>
        @endif
    </div>

    {{-- Absences --}}
    @if(count($v['absences']) > 0)
    <div class="section-heading">Absences ({{ $s['totalAbsences'] }} {{ $s['totalAbsences'] == 1 ? 'day' : 'days' }})</div>
    <table class="ev-table">
        <thead><tr><th style="width:130px">Date</th><th>Status</th></tr></thead>
        <tbody>
            @foreach($v['absences'] as $row)
            <tr><td>{{ $row['dateFormatted'] }}</td><td>{{ $row['status'] }}</td></tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- Late AM --}}
    @if(count($v['lateAM']) > 0)
    <div class="section-heading">Late Arrivals — Morning ({{ $s['totalLateAM'] }} {{ $s['totalLateAM'] == 1 ? 'instance' : 'instances' }})</div>
    <table class="ev-table">
        <thead><tr><th style="width:130px">Date</th><th style="width:90px">Time In</th><th style="width:100px">Late By</th></tr></thead>
        <tbody>
            @foreach($v['lateAM'] as $row)
            <tr><td>{{ $row['dateFormatted'] }}</td><td>{{ $row['timeIn'] ?? '—' }}</td><td>{{ $row['timeStr'] }}</td></tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- Late PM --}}
    @if(count($v['latePM']) > 0)
    <div class="section-heading">Late Returns — Afternoon ({{ $s['totalLatePM'] }} {{ $s['totalLatePM'] == 1 ? 'instance' : 'instances' }})</div>
    <table class="ev-table">
        <thead><tr><th style="width:130px">Date</th><th style="width:90px">Time In (PM)</th><th style="width:100px">Late By</th></tr></thead>
        <tbody>
            @foreach($v['latePM'] as $row)
            <tr><td>{{ $row['dateFormatted'] }}</td><td>{{ $row['timeIn'] ?? '—' }}</td><td>{{ $row['timeStr'] }}</td></tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- Missing Logs --}}
    @if(count($v['missedLogs']) > 0)
    <div class="section-heading">Missing Biometric Logs ({{ $s['totalMissedLogs'] }} {{ $s['totalMissedLogs'] == 1 ? 'instance' : 'instances' }})</div>
    <table class="ev-table">
        <thead>
            <tr>
                <th style="width:110px">Date</th>
                <th style="width:72px">AM In</th>
                <th style="width:72px">AM Out</th>
                <th style="width:72px">PM In</th>
                <th style="width:72px">PM Out</th>
                <th>Missing Slots</th>
            </tr>
        </thead>
        <tbody>
            @foreach($v['missedLogs'] as $row)
            <tr>
                <td>{{ $row['dateFormatted'] }}</td>
                <td class="{{ !$row['timeInAM']    ? 'miss' : '' }}">{{ $row['timeInAM']    ?? '—' }}</td>
                <td class="{{ !$row['timeOutLunch'] ? 'miss' : '' }}">{{ $row['timeOutLunch'] ?? '—' }}</td>
                <td class="{{ !$row['timeInPM']    ? 'miss' : '' }}">{{ $row['timeInPM']    ?? '—' }}</td>
                <td class="{{ !$row['timeOutPM']   ? 'miss' : '' }}">{{ $row['timeOutPM']   ?? '—' }}</td>
                <td class="miss">{{ implode(', ', $row['missing']) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- Undertime --}}
    @if(count($v['undertime'] ?? []) > 0)
    <div class="section-heading">Undertime ({{ $s['totalUndertime'] }} {{ $s['totalUndertime'] == 1 ? 'instance' : 'instances' }})</div>
    <table class="ev-table">
        <thead><tr><th style="width:130px">Date</th><th style="width:90px">Time Out</th><th style="width:100px">Undertime By</th></tr></thead>
        <tbody>
            @foreach($v['undertime'] as $row)
            <tr><td>{{ $row['dateFormatted'] }}</td><td>{{ $row['timeOut'] ?? '—' }}</td><td>{{ $row['timeStr'] }}</td></tr>
            @endforeach
        </tbody>
    </table>
    @endif

    @if(count($v['absences']) == 0 && count($v['lateAM']) == 0 && count($v['latePM']) == 0 && count($v['missedLogs']) == 0 && count($v['undertime'] ?? []) == 0)
    <p style="color:#166534; font-size:9.5pt; margin-bottom:10px;">No attendance violations found for this period.</p>
    @endif

    {{-- Action Required — dynamic list based on violations present --}}
    <div class="action-box">
        <strong>Action Required:</strong>
        <ol>
            <li>Submit a written explanation for each violation category listed above within two (2) business days.</li>
            @if(count($v['absences']) > 0)
            <li>For absences, provide supporting documentation (e.g., medical certificate or approved leave form).</li>
            @endif
            @if(count($v['missedLogs'] ?? []) > 0)
            <li>For missing biometric logs, please provide the time and location where you were last seen, along with proof of attendance (such as supervisor certification, completed work output, or other verifiable evidence).</li>
            @endif
            @if(count($v['lateAM']) > 0 || count($v['latePM']) > 0)
            <li>For late arrivals, explain the reason and commit to a corrective action plan.</li>
            @endif
            @if(count($v['undertime'] ?? []) > 0)
            <li>For undertime, secure prior approval for early departures or provide a valid justification.</li>
            @endif
        </ol>
    </div>

    {{-- Closing --}}
    <p class="closing">Failure to comply or repeated violations may result in further disciplinary action in accordance with company policy.</p>

    {{-- Signatures --}}
    <div class="sig-section">
        <div class="sig-row">
            <div class="sig-col">
                <p class="sig-sub">Prepared by:</p>
                <div class="sig-line"></div>
                <p class="sig-name">MARK LESTER M. TO-ONG</p>
                <p class="sig-sub">Operations Manager</p>
            </div>
            <div class="sig-col">
                <p class="sig-sub">Acknowledged by:</p>
                <div class="sig-line"></div>
                <p class="sig-name">{{ $emp['employee']['name'] }}</p>
                <p class="sig-sub">Employee &nbsp;&nbsp;&nbsp; Date: ___________________</p>
            </div>
        </div>
    </div>

</div>
@endforeach

</body>
</html>
