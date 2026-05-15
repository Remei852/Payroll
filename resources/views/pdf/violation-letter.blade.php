<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>NOTICE TO EXPLAIN</title>
    <style>
        @page { margin: 0.5in; }
        * { box-sizing: border-box; }

        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 8.5pt;
            line-height: 1.15;
            color: #1e293b;
            background: white;
            margin: 0;
        }

        /* ── Letter title ── */
        .letter-title {
            text-align: center;
            font-size: 11pt;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin: 4px 0 4px;
            color: #0f172a;
        }

        /* ── Employee info block ── */
        .info-block {
            border: 1px solid #e2e8f0;
            border-radius: 3px;
            padding: 5px 10px;
            margin-bottom: 4px;
            background: #f8fafc;
            font-size: 8.5pt;
        }
        .info-grid { display: table; width: 100%; }
        .info-row  { display: table-row; }
        .info-label { display: table-cell; width: 110px; font-weight: 700; padding: 0.5px 0; color: #475569; }
        .info-value { display: table-cell; padding: 0.5px 0; }

        hr { border: 0; border-top: 1px solid #cbd5e1; margin: 3px 0; }

        /* ── Body text ── */
        .body-text { font-size: 8.5pt; line-height: 1.15; margin: 0 0 3px 0; text-align: left; }

        /* ── Summary chips ── */
        .summary-row { margin-bottom: 4px; }
        .chip {
            display: inline-block;
            border: 1px solid #cbd5e1;
            border-radius: 3px;
            padding: 1px 6px;
            font-size: 8pt;
            margin-right: 4px;
            background: #fff;
        }
        .chip-val { font-weight: 700; color: #dc2626; }

        /* ── Section headings ── */
        .section-heading {
            font-size: 8.5pt;
            font-weight: 700;
            margin: 4px 0 1px;
            padding-bottom: 1px;
            border-bottom: 1px solid #cbd5e1;
            color: #0f172a;
        }

        /* ── Section notice ── */
        .section-notice {
            font-size: 8pt;
            color: #334155;
            margin-bottom: 2px;
            text-align: justify;
            line-height: 1.25;
            background: #f8fafc;
            border-left: 3px solid #94a3b8;
            padding: 3px 8px;
            white-space: pre-line;
        }

        /* ── Evidence table ── */
        .ev-table { width: auto; border-collapse: collapse; font-size: 8pt; margin-bottom: 3px; }
        .ev-table th {
            background: #1e3a8a;
            color: #fff;
            font-weight: 700;
            padding: 1px 6px;
            text-align: left;
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            white-space: nowrap;
        }
        .ev-table td { padding: 1px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .ev-table tbody tr:nth-child(even) td { background: #f8fafc; }
        .miss { color: #dc2626; font-weight: 700; }

        /* ── Action required ── */
        .action-box {
            border: 1px solid #cbd5e1;
            border-radius: 3px;
            padding: 3px 8px;
            font-size: 8.5pt;
            line-height: 1.15;
            margin-bottom: 3px;
            background: #fefce8;
            white-space: pre-line;
        }
        .action-text { margin-top: 1px; font-size: 8.5pt; line-height: 1.15; white-space: pre-line; }

        .policy-box { 
            border: 1px solid #bfdbfe; 
            border-radius: 3px; 
            padding: 3px 10px; 
            background: #f0f9ff; 
            margin-bottom: 5px; 
            font-size: 8.5pt; 
            line-height: 1.15;
            text-align: left;
        }
        .policy-box .policy-title { font-weight: 700; color: #0f172a; font-size: 9.5pt; display: block; margin-bottom: 2px; }
        .policy-content { white-space: pre-line; }
        .policy-label { font-weight: 700; color: #1e293b; display: block; margin: 2px 0 1px; }
        
        .penalty-list { margin: -2px 0 -4px 15px !important; padding: 0 !important; list-style-type: disc; }
        .penalty-list li { margin: 0 !important; padding: 0 !important; color: #334155; line-height: 1.0; }

        .closing { font-size: 8.5pt; line-height: 1.15; text-align: left; margin: 3px 0; }

        /* ── Signatures ── */
        .sig-section { margin-top: 5px; }
        .sig-row { display: table; width: 100%; }
        .sig-col { display: table-cell; width: 50%; vertical-align: bottom; padding-right: 20px; }
        .sig-line { border-bottom: 1px solid #64748b; width: 200px; margin-top: 15px; margin-bottom: 2px; }
        .sig-name { font-weight: 700; font-size: 9pt; }
        .sig-sub  { font-size: 8pt; color: #475569; }
    </style>
</head>
<body>
{{-- Ensure Grace Bank variables are defined --}}
@php
    $graceBankDays = $graceBankDays ?? 0;
    $graceBankDetails = $graceBankDetails ?? [];
@endphp


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

    {{-- Greeting paragraph --}}
    <p class="body-text" style="white-space: pre-line; line-height: 1.15; text-align: left;">{{ $content['greeting'] ?? '' }}</p>

    {{-- Summary --}}
    <div class="summary-row">
        @if($summary['totalAbsences'] > 0)
            <span class="chip">Absences: <span class="chip-val">{{ $summary['totalAbsences'] }}</span></span>
        @endif

        @if($summary['graceBankEnabled'] ?? false)
            @if(($summary['totalAccumulatedLate'] ?? 0) > 0)
                <span class="chip">Tardiness: <span class="chip-val" style="color: {{ $summary['graceBankExceeded'] ? '#dc2626' : '#0f172a' }}">{{ $summary['totalAccumulatedLate'] }} mins{{ $summary['graceBankExceeded'] ? ' (Exceeded)' : '' }}</span></span>
            @endif
        @else
            @if($summary['totalLateAM'] > 0)
                <span class="chip">Late AM: <span class="chip-val">{{ $summary['totalLateAM'] }} day(s)</span></span>
            @endif
            @if($summary['totalLatePM'] > 0)
                <span class="chip">Late PM: <span class="chip-val">{{ $summary['totalLatePM'] }} day(s)</span></span>
            @endif
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
    <div class="section-heading"><strong>Violation</strong> Absences ({{ $summary['totalAbsences'] }} {{ $summary['totalAbsences'] == 1 ? 'day' : 'days' }})</div>
    <div style="line-height:1.15; margin-bottom:2px; text-align:justify;">{{ $content['absenceNotice'] }}</div>
    <table class="ev-table">
        <thead>
            <tr><th style="width:130px">Date</th><th>Status</th></tr>
        </thead>
        <tbody>
            @foreach($violations['absences'] as $row)
            <tr><td>{{ $row['dateFormatted'] }}</td><td>{{ $row['status'] }}</td></tr>
            @endforeach
        </tbody>
    </table>
@else
    <div class="section-heading"><strong>Violation</strong> Absences</div>
    <p class="body-text">No absences recorded for this period.</p>
@endif

    {{-- ── Late AM ── --}}
    @if(!($summary['graceBankEnabled'] ?? false) && count($violations['lateAM']) > 0)
    <div class="section-heading"><strong>Violation</strong> Tardiness AM IN ({{ $summary['totalLateAM'] }} {{ $summary['totalLateAM'] == 1 ? 'instance' : 'instances' }})</div>
    <div style="line-height:1.15; margin-bottom:2px; text-align:justify;">{{ $content['lateAMNotice'] }}</div>
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
    @if(!($summary['graceBankEnabled'] ?? false) && count($violations['latePM']) > 0)
    <div class="section-heading"><strong>Violation</strong> Tardiness PM IN ({{ $summary['totalLatePM'] }} {{ $summary['totalLatePM'] == 1 ? 'instance' : 'instances' }})</div>
    <div style="line-height:1.15; margin-bottom:2px; text-align:justify;">{{ $content['latePMNotice'] }}</div>
    <table class="ev-table">
        <thead><tr><th style="width:130px">Date</th><th style="width:90px">Time In (PM)</th><th style="width:100px">Late By</th></tr></thead>
        <tbody>
            @foreach($violations['latePM'] as $row)
            <tr><td>{{ $row['dateFormatted'] }}</td><td>{{ $row['timeIn'] ?? '—' }}</td><td>{{ $row['timeStr'] }}</td></tr>
            @endforeach
        </tbody>
    </table>
    @endif

{{-- Grace Bank Accumulation --}}
@if(($summary['graceBankEnabled'] ?? false) && ($summary['totalAccumulatedLate'] ?? 0) > 0)
    <div class="section-heading"><strong>Tardiness: Accumulated Lates</strong></div>
    <div class="summary-row">
        <span class="chip">Total Late Minutes:
            <span class="chip-val">{{ $summary['totalAccumulatedLate'] }}</span>
        </span>
        <span class="chip">Late Days:
            <span class="chip-val">{{ $graceBankDays }}</span>
        </span>
        @if($summary['graceBankExceeded'])
            <span class="chip">Grace Bank Exceeded</span>
        @endif
    </div>
    <p class="body-text">
        @if($summary['graceBankExceeded'])
            Based on attendance records, your accumulated late minutes for the current pay period have reached/exceeded the department's allowed grace bank threshold.
        @else
            You incurred a total of {{ $summary['totalAccumulatedLate'] }} late minutes across {{ $graceBankDays }} occurrence(s) within the covered payroll period.
        @endif
    </p>
    <table class="ev-table">
        <thead>
            <tr>
                <th style="width:110px">Date</th>
                <th style="width:70px">AM IN</th>
                <th style="width:70px">AM OUT</th>
                <th style="width:70px">PM IN</th>
                <th style="width:70px">PM OUT</th>
                <th style="width:80px">Minutes</th>
                <th style="width:100px">Accumulated</th>
            </tr>
        </thead>
        <tbody>
            @foreach($graceBankDetails as $row)
                <tr>
                    <td>{{ $row['dateFormatted'] }}</td>
                    <td>{{ $row['time_in_am'] }}</td>
                    <td>{{ $row['time_out_am'] }}</td>
                    <td>{{ $row['time_in_pm'] }}</td>
                    <td>{{ $row['time_out_pm'] }}</td>
                    <td>{{ $row['minutes'] }}</td>
                    <td>{{ $row['accumulated'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endif

    {{-- ── Missing Logs ── --}}
    @if(count($violations['missedLogs']) > 0)
    <div class="section-heading"><strong>Violation</strong> Missing Biometric Logs ({{ $summary['totalMissedLogs'] }} {{ $summary['totalMissedLogs'] == 1 ? 'instance' : 'instances' }})</div>
    <div style="line-height:1.15; margin-bottom:2px; text-align:justify;">{{ $content['missedLogNotice'] }}</div>
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
    <div class="section-heading"><strong>Violation</strong> Undertime ({{ $summary['totalUndertime'] }} {{ $summary['totalUndertime'] == 1 ? 'instance' : 'instances' }})</div>
    <div style="line-height:1.15; margin-bottom:2px; text-align:justify;">{{ $content['undertimeNotice'] }}</div>
    <table class="ev-table">
        <thead>
            <tr><th style="width:130px">Date</th><th style="width:90px">Time Out</th><th style="width:100px">Undertime By</th></tr>
        </thead>
        <tbody>
            @foreach($violations['undertime'] as $row)
            <tr><td>{{ $row['dateFormatted'] }}</td><td>{{ $row['timeOut'] ?? '—' }}</td><td>{{ $row['timeStr'] }}</td></tr>
            @endforeach
        </tbody>
    </table>
@else
    <div class="section-heading"><strong>Violation</strong> Undertime</div>
    <p class="body-text">No undertime recorded for this period.</p>
@endif

    {{-- Opening/Combined text moved below tables --}}
    <p class="body-text" style="white-space: pre-line; line-height: 1.15;">{{ $content['opening'] }}</p>

    {{-- Action required — dynamic list based on violations present --}}
    <div class="action-box">
        <strong>Action Required:</strong>
        <div class="action-text">{{ $content['actionRequired'] }}</div>
    </div>

    @if(count($violations['absences']) > 0 || count($violations['undertime'] ?? []) > 0 || count($violations['missedLogs']) > 0 || count($violations['lateAM']) > 0 || count($violations['latePM']) > 0 || ($summary['habitualTardiness'] ?? false))
    <p class="body-text" style="margin-bottom: 3px; line-height: 1.15;">{{ $content['policyIntro'] ?? 'To remind you, below are the company policies regarding Attendance Management:' }}</p>
    @endif

    {{-- Detailed Policy Boxes --}}
    @if(count($violations['absences']) > 0)
    <div class="policy-box">
        <span class="policy-title">Policy: Absences</span>
        <div class="policy-content">
            <div style="margin-bottom: 2px;">{{ $content['absencesPolicy']['rule'] }}</div>
            <span class="policy-label">Penalties:</span>
            <ul class="penalty-list">@foreach(explode('|', $content['absencesPolicy']['penalties']) as $penalty)<li>{{ trim($penalty) }}</li>@endforeach</ul>
            @if(!empty($content['absencesPolicy']['note']))
                <div style="margin-top: 1px;">{{ $content['absencesPolicy']['note'] }}</div>
            @endif
        </div>
    </div>
    @endif

    @if(count($violations['missedLogs']) > 0)
    <div class="policy-box">
        <span class="policy-title">Policy: Improper Logs</span>
        <div class="policy-content">
            <div style="margin-bottom: 2px;">{{ $content['missedLogsPolicy']['rule'] }}</div>
            <span class="policy-label">Penalties:</span>
            <ul class="penalty-list">@foreach(explode('|', $content['missedLogsPolicy']['penalties']) as $penalty)<li>{{ trim($penalty) }}</li>@endforeach</ul>
            @if(!empty($content['missedLogsPolicy']['note']))
                <div style="margin-top: 1px;">{{ $content['missedLogsPolicy']['note'] }}</div>
            @endif
        </div>
    </div>
    @endif

    @if(count($violations['undertime'] ?? []) > 0)
    <div class="policy-box">
        <span class="policy-title">Policy: Undertime</span>
        <div class="policy-content">
            <div style="margin-bottom: 2px;">{{ $content['undertimePolicy']['rule'] }}</div>
            <span class="policy-label">Penalties:</span>
            <ul class="penalty-list">@foreach(explode('|', $content['undertimePolicy']['penalties']) as $penalty)<li>{{ trim($penalty) }}</li>@endforeach</ul>
            @if(!empty($content['undertimePolicy']['note']))
                <div style="margin-top: 1px;">{{ $content['undertimePolicy']['note'] }}</div>
            @endif
        </div>
    </div>
    @endif

    @if(count($violations['lateAM']) > 0 || count($violations['latePM']) > 0 || ($summary['habitualTardiness'] ?? false) || (($summary['graceBankEnabled'] ?? false) && ($summary['totalAccumulatedLate'] ?? 0) > 0))
    <div class="policy-box">
        <span class="policy-title">Policy: Habitual Tardiness</span>
        <div class="policy-content">
            <div style="margin-bottom: 2px;">{{ $content['tardinessPolicy']['rule'] }}</div>
            <span class="policy-label">Penalties:</span>
            <ul class="penalty-list">@foreach(explode('|', $content['tardinessPolicy']['penalties']) as $penalty)<li>{{ trim($penalty) }}</li>@endforeach</ul>
            @if(!empty($content['tardinessPolicy']['note']))
                <div style="margin-top: 1px;">{{ $content['tardinessPolicy']['note'] }}</div>
            @endif
        </div>
    </div>
    @endif

    {{-- Closing --}}
    <p class="closing" style="white-space: pre-line; line-height: 1.15;">{{ $content['closing'] ?? '' }}</p>

    {{-- Signatures --}}
    <div class="sig-section">
        <div class="sig-row">
            <div class="sig-col">
                <p class="sig-sub">Prepared by:</p>
                <div class="sig-line"></div>
                <p class="sig-name" style="margin: 0;">{{ $content['preparedBy'] }}</p>
                <p class="sig-sub" style="margin: 0;">{{ $content['position'] }}</p>
            </div>
            <div class="sig-col">
                <p class="sig-sub" style="margin: 0;">Acknowledged by:</p>
                <div class="sig-line"></div>
                <p class="sig-name" style="margin: 0;">{{ $employee['name'] }}</p>
                <p class="sig-sub" style="margin: 0;">Employee &nbsp;&nbsp;&nbsp; Date: ___________________</p>
            </div>
        </div>
    </div>

</body>
</html>
