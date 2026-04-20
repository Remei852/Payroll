<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Notice of Attendance Violations</title>
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

        /* ── Company header ── */
        .company-header {
            text-align: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 2px solid #1e3a8a;
        }
        .company-name { font-size: 13pt; font-weight: 700; color: #1e3a8a; letter-spacing: 0.04em; }
        .company-address { font-size: 8.5pt; color: #64748b; margin-top: 2px; }

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

        /* ── Section notice (policy paragraph per violation type) ── */
        .section-notice {
            font-size: 8.5pt;
            color: #334155;
            margin-bottom: 6px;
            text-align: justify;
            line-height: 1.5;
            background: #f8fafc;
            border-left: 3px solid #94a3b8;
            padding: 5px 8px;
            white-space: pre-line;
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
            white-space: pre-line;
        }

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

    {{-- Company header --}}
    <!--
    <div class="company-header">
        <div class="company-name">{{ env('COMPANY_NAME', config('app.name')) }}</div>
        @if(env('COMPANY_ADDRESS'))
        <div class="company-address">{{ env('COMPANY_ADDRESS') }}</div>
        @endif
    </div> -->

    {{-- Letter title --}}
    <div class="letter-title">{{ $content['subject'] }}</div>

    {{-- Employee info block --}}
    <div class="info-block">
        <div class="info-grid">
            <div class="info-row"><div class="info-label">Employee Name:</div><div class="info-value">{{ $employee['name'] }}</div></div>
            <div class="info-row"><div class="info-label">Employee Code:</div><div class="info-value">{{ $employee['code'] }}</div></div>
            <div class="info-row"><div class="info-label">Department:</div><div class="info-value">{{ $employee['department'] }}</div></div>
            <div class="info-row"><div class="info-label">Period Covered:</div><div class="info-value">{{ $dateRange['startFormatted'] }} to {{ $dateRange['endFormatted'] }}</div></div>
            <div class="info-row"><div class="info-label">Date Issued:</div><div class="info-value">{{ $currentDate }}</div></div>
            @if(!empty($content['referenceNo']))
          <!--   <div class="info-row"><div class="info-label">Reference No.:</div><div class="info-value">{{ $content['referenceNo'] }}</div></div>-->
            @endif
        </div>
    </div>

    <hr>

    {{-- Opening paragraph --}}
    <p class="body-text">{{ $content['opening'] }}</p>

    {{-- Policy paragraph --}}
    <p class="body-text">{{ $content['policyParagraph'] }}</p>

    {{-- Summary --}}
    <div class="summary-row">
        @if($summary['totalAbsences'] > 0)
            <span class="chip">Absences: <span class="chip-val">{{ $summary['totalAbsences'] }}</span></span>
        @endif
        @if($summary['totalLateAM'] > 0)
            <span class="chip">Late AM: <span class="chip-val">{{ $summary['totalLateAM'] }}</span></span>
        @endif
        @if($summary['totalLatePM'] > 0)
            <span class="chip">Late PM: <span class="chip-val">{{ $summary['totalLatePM'] }}</span></span>
        @endif
        @if($summary['totalMissedLogs'] > 0)
            <span class="chip">Missing Logs: <span class="chip-val">{{ $summary['totalMissedLogs'] }}</span></span>
        @endif
        @if(($summary['totalUndertime'] ?? 0) > 0)
            <span class="chip">Undertime: <span class="chip-val">{{ $summary['totalUndertime'] }}</span></span>
        @endif
    </div>

    {{-- ── Absences ── --}}
    @if(count($violations['absences']) > 0)
    <div class="section-heading">Absences ({{ $summary['totalAbsences'] }} {{ $summary['totalAbsences'] == 1 ? 'day' : 'days' }})</div>
    <table class="ev-table">
        <thead><tr><th style="width:130px">Date</th><th>Status</th></tr></thead>
        <tbody>
            @foreach($violations['absences'] as $row)
            <tr><td>{{ $row['dateFormatted'] }}</td><td>{{ $row['status'] }}</td></tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- ── Late AM ── --}}
    @if(count($violations['lateAM']) > 0)
    <div class="section-heading">Late Arrivals — Morning ({{ $summary['totalLateAM'] }} {{ $summary['totalLateAM'] == 1 ? 'instance' : 'instances' }})</div>
    <table class="ev-table">
        <thead><tr><th style="width:130px">Date</th><th style="width:90px">Time In</th><th style="width:100px">Late By</th></tr></thead>
        <tbody>
            @foreach($violations['lateAM'] as $row)
            <tr><td>{{ $row['dateFormatted'] }}</td><td>{{ $row['timeIn'] ?? '—' }}</td><td>{{ $row['timeStr'] }}</td></tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- ── Late PM ── --}}
    @if(count($violations['latePM']) > 0)
    <div class="section-heading">Late Returns — Afternoon ({{ $summary['totalLatePM'] }} {{ $summary['totalLatePM'] == 1 ? 'instance' : 'instances' }})</div>
    <table class="ev-table">
        <thead><tr><th style="width:130px">Date</th><th style="width:90px">Time In (PM)</th><th style="width:100px">Late By</th></tr></thead>
        <tbody>
            @foreach($violations['latePM'] as $row)
            <tr><td>{{ $row['dateFormatted'] }}</td><td>{{ $row['timeIn'] ?? '—' }}</td><td>{{ $row['timeStr'] }}</td></tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- ── Missing Logs ── --}}
    @if(count($violations['missedLogs']) > 0)
    <div class="section-heading">Missing Biometric Logs ({{ $summary['totalMissedLogs'] }} {{ $summary['totalMissedLogs'] == 1 ? 'instance' : 'instances' }})</div>
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
            @foreach($violations['missedLogs'] as $row)
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

    @if(count($violations['absences']) == 0 && count($violations['lateAM']) == 0 && count($violations['latePM']) == 0 && count($violations['missedLogs']) == 0 && count($violations['undertime'] ?? []) == 0)
    <p style="color:#166534; font-size:9.5pt; margin-bottom:10px;">No attendance violations found for this period.</p>
    @endif

    {{-- Undertime --}}
    @if(count($violations['undertime'] ?? []) > 0)
    <div class="section-heading">Undertime ({{ $summary['totalUndertime'] }} {{ $summary['totalUndertime'] == 1 ? 'instance' : 'instances' }})</div>
    <table class="ev-table">
        <thead><tr><th style="width:130px">Date</th><th style="width:90px">Time Out</th><th style="width:100px">Undertime By</th></tr></thead>
        <tbody>
            @foreach($violations['undertime'] as $row)
            <tr><td>{{ $row['dateFormatted'] }}</td><td>{{ $row['timeOut'] ?? '—' }}</td><td>{{ $row['timeStr'] }}</td></tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- Consolidated notes — plain paragraphs, no box --}}
    @if(count($violations['absences']) > 0 || count($violations['lateAM']) > 0 || count($violations['latePM']) > 0 || count($violations['missedLogs']) > 0 || count($violations['undertime'] ?? []) > 0)
    <div style="border-top:1px solid #e2e8f0; padding-top:8px; margin-bottom:10px; margin-top:4px;">
        @if(count($violations['absences']) > 0)
        <p style="font-size:8.5pt; line-height:1.55; margin-bottom:5px; text-align:justify;">
            <strong>Absences:</strong> {{ $content['absenceNotice'] }}
        </p>
        @endif
        @if(count($violations['lateAM']) > 0)
        <p style="font-size:8.5pt; line-height:1.55; margin-bottom:5px; text-align:justify;">
            <strong>Late AM:</strong> {{ $content['lateAMNotice'] }}
        </p>
        @endif
        @if(count($violations['latePM']) > 0)
        <p style="font-size:8.5pt; line-height:1.55; margin-bottom:5px; text-align:justify;">
            <strong>Late PM:</strong> {{ $content['latePMNotice'] }}
        </p>
        @endif
        @if(count($violations['missedLogs']) > 0)
        <p style="font-size:8.5pt; line-height:1.55; margin-bottom:5px; text-align:justify;">
            <strong>Missing Logs:</strong> {{ $content['missedLogNotice'] }}
        </p>
        @endif
        @if(count($violations['undertime'] ?? []) > 0)
        <p style="font-size:8.5pt; line-height:1.55; margin-bottom:5px; text-align:justify;">
            <strong>Undertime:</strong> {{ $content['undertimeNotice'] }}
        </p>
        @endif
    </div>
    @endif

    {{-- Action required — dynamic list based on violations present --}}
    <div class="action-box">
        <strong>Action Required:</strong>
        <ol style="margin-left:16px; margin-top:5px;">
            <li style="margin-bottom:3px;">Report to the Human Resources office within five (5) working days from receipt of this memorandum.</li>
            <li style="margin-bottom:3px;">Submit a written explanation for each violation category listed above within two (2) business days.</li>
            @if(count($violations['absences']) > 0)
            <li style="margin-bottom:3px;">For absences, provide supporting documentation (e.g., medical certificate or approved leave form).</li>
            @endif
            @if(count($violations['missedLogs'] ?? []) > 0)
            <li style="margin-bottom:3px;">For missing biometric logs, attach proof of attendance (supervisor certification, work output, or other verifiable evidence).</li>
            @endif
            @if(count($violations['lateAM']) > 0 || count($violations['latePM']) > 0)
            <li style="margin-bottom:3px;">For late arrivals, explain the reason and commit to a corrective action plan.</li>
            @endif
            @if(count($violations['undertime'] ?? []) > 0)
            <li style="margin-bottom:3px;">For undertime, secure prior approval for early departures or provide a valid justification.</li>
            @endif
        </ol>
    </div>

    {{-- Closing --}}
    <p class="closing">{{ $content['closing'] }}</p>

    {{-- Signatures --}}
    <div class="sig-section">
        <div class="sig-row">
            <div class="sig-col">
                <p class="sig-sub">Prepared by:</p>
                <div class="sig-line"></div>
                <p class="sig-name">{{ $content['preparedBy'] }}</p>
                <p class="sig-sub">{{ $content['position'] }}</p>
            </div>
            <div class="sig-col">
                <p class="sig-sub">Acknowledged by:</p>
                <div class="sig-line"></div>
                <p class="sig-name">{{ $employee['name'] }}</p>
                <p class="sig-sub">Employee &nbsp;&nbsp;&nbsp; Date: ___________________</p>
            </div>
        </div>
    </div>

</body>
</html>
