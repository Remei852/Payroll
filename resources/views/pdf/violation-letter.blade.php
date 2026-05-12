<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>NOTICE TO EXPLAIN </title>
    <style>
        @page { margin: 0.5in; }
        * { box-sizing: border-box; }

        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 8pt;
            line-height: 1.15;
            color: #1e293b;
            background: white;
            margin: 0;
        }

        /* ── Letter title ── */
        .letter-title {
            text-align: center;
            font-size: 10pt;
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
            font-size: 8pt;
        }
        .info-grid { display: table; width: 100%; }
        .info-row  { display: table-row; }
        .info-label { display: table-cell; width: 110px; font-weight: 700; padding: 1.5px 0; color: #475569; }
        .info-value { display: table-cell; padding: 1.5px 0; }

        hr { border: 0; border-top: 1px solid #cbd5e1; margin: 8px 0; }

        /* ── Body text ── */
        .body-text { font-size: 8pt; line-height: 1.15; margin-bottom: 8px; text-align: left; }

        /* ── Summary chips ── */
        .summary-row { margin-bottom: 10px; }
        .chip {
            display: inline-block;
            border: 1px solid #cbd5e1;
            border-radius: 3px;
            padding: 2px 7px;
            font-size: 8pt;
            margin-right: 5px;
            background: #fff;
        }
        .chip-val { font-weight: 700; color: #dc2626; }

        /* ── Section headings ── */
        .section-heading {
            font-size: 8pt;
            font-weight: 700;
            margin: 10px 0 4px;
            padding-bottom: 2px;
            border-bottom: 1px solid #cbd5e1;
            color: #0f172a;
        }

        /* ── Section notice (policy paragraph per violation type) ── */
        .section-notice {
            font-size: 8pt;
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
            font-size: 8pt;
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
            font-size: 8pt;
            line-height: 1.15;
            margin-bottom: 8px;
            background: #fefce8;
            white-space: pre-line;
        }
        .action-text { margin-top: 5px; font-size: 8pt; line-height: 1.15; white-space: pre-line; }

        .policy-box {
            border: 1px solid #bfdbfe;
            border-radius: 3px;
            padding: 10px 12px;
            font-size: 8pt;
            line-height: 1.15;
            margin-bottom: 8px;
            background: #eff6ff;
        }
        .policy-title { font-weight: 700; margin-bottom: 6px; }
        .policy-box p { margin-bottom: 6px; }
        .policy-box p:last-child { margin-bottom: 0; }
        .policy-box .penalties { margin-bottom: 6px; }
        .policy-box .penalties div { margin-bottom: 2px; }

        .closing { font-size: 8pt; line-height: 1.15; text-align: left; margin-bottom: 8px; }

        /* ── Signatures ── */
        .sig-section { margin-top: 18px; }
        .sig-row { display: table; width: 100%; }
        .sig-col { display: table-cell; width: 50%; vertical-align: bottom; padding-right: 20px; }
        .sig-line { border-bottom: 1px solid #64748b; width: 200px; margin-top: 26px; margin-bottom: 3px; }
        .sig-name { font-weight: 700; font-size: 8pt; }
        .sig-sub  { font-size: 8pt; color: #475569; }
    </style>
</head>
<body>


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
    <p class="body-text" style="white-space: pre-line; line-height: 1.5; text-align: left;">{{ $content['greeting'] ?? '' }}</p>

    {{-- Summary --}}
    <div class="summary-row">
        @if($summary['totalAbsences'] > 0)
            <span class="chip">Absences: <span class="chip-val">{{ $summary['totalAbsences'] }}</span></span>
        @endif
        @if($summary['totalLateAM'] > 0)
            <span class="chip">Tardiness AM IN: <span class="chip-val">{{ $summary['totalLateAM'] }}</span></span>
        @endif
        @if($summary['totalLatePM'] > 0)
            <span class="chip">Tardiness PM IN: <span class="chip-val">{{ $summary['totalLatePM'] }}</span></span>
        @endif
        @if($summary['totalMissedLogs'] > 0)
            <span class="chip">Missing Logs: <span class="chip-val">{{ $summary['totalMissedLogs'] }}</span></span>
        @endif
        @if(($summary['totalUndertime'] ?? 0) > 0)
            <span class="chip">Undertime: <span class="chip-val">{{ $summary['totalUndertime'] }}</span></span>
        @endif
        @if(($summary['graceBankEnabled'] ?? false) && ($summary['graceBankExceeded'] ?? false))
            <span class="chip">Grace Bank Exceeded: <span class="chip-val">{{ $summary['graceBankUsedMinutes'] ?? 0 }}/{{ $summary['graceBankLimitMinutes'] ?? 0 }} mins ({{ $summary['graceUsages'] ?? 0 }}/{{ $summary['graceMaxUsages'] ?? 0 }} times)</span></span>
        @elseif(($summary['graceBankEnabled'] ?? false) && ($summary['graceBankUsedMinutes'] ?? 0) > 0)
            <span class="chip">Grace Bank Used: <span style="color:#0f172a">{{ $summary['graceBankUsedMinutes'] ?? 0 }}/{{ $summary['graceBankLimitMinutes'] ?? 0 }} mins ({{ $summary['graceUsages'] ?? 0 }}/{{ $summary['graceMaxUsages'] ?? 0 }} times)</span></span>
        @endif
    </div>

    {{-- ── Absences ── --}}
    @if(count($violations['absences']) > 0)
    <div class="section-heading"><strong>Violation</strong> Absences ({{ $summary['totalAbsences'] }} {{ $summary['totalAbsences'] == 1 ? 'day' : 'days' }})</div>
    <div style="line-height:1.55; margin-bottom:6px; text-align:justify;">{{ $content['absenceNotice'] }}</div>
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
    <div class="section-heading"><strong>Violation</strong> Tardiness AM IN ({{ $summary['totalLateAM'] }} {{ $summary['totalLateAM'] == 1 ? 'instance' : 'instances' }})</div>
    <div style="line-height:1.55; margin-bottom:6px; text-align:justify;">{{ $content['lateAMNotice'] }}</div>
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
    <div class="section-heading"><strong>Violation</strong> Tardiness PM IN ({{ $summary['totalLatePM'] }} {{ $summary['totalLatePM'] == 1 ? 'instance' : 'instances' }})</div>
    <div style="line-height:1.55; margin-bottom:6px; text-align:justify;">{{ $content['latePMNotice'] }}</div>
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
    <div class="section-heading"><strong>Violation</strong> Missing Biometric Logs ({{ $summary['totalMissedLogs'] }} {{ $summary['totalMissedLogs'] == 1 ? 'instance' : 'instances' }})</div>
    <div style="line-height:1.55; margin-bottom:6px; text-align:justify;">{{ $content['missedLogNotice'] }}</div>
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
    <div style="line-height:1.55; margin-bottom:6px; text-align:justify;">{{ $content['undertimeNotice'] }}</div>
    <table class="ev-table">
        <thead><tr><th style="width:130px">Date</th><th style="width:90px">Time Out</th><th style="width:100px">Undertime By</th></tr></thead>
        <tbody>
            @foreach($violations['undertime'] as $row)
            <tr><td>{{ $row['dateFormatted'] }}</td><td>{{ $row['timeOut'] ?? '—' }}</td><td>{{ $row['timeStr'] }}</td></tr>
            @endforeach
        </tbody>
    </table>
    @endif

    {{-- Opening/Combined text moved below tables --}}
    <p class="body-text" style="white-space: pre-line; line-height: 1.5;">{{ $content['opening'] }}</p>

    {{-- Action required — dynamic list based on violations present --}}
    <div class="action-box">
        <strong>Action Required:</strong>
        <div class="action-text">{{ $content['actionRequired'] }}</div>
    </div>

    @if(count($violations['absences']) > 0 || count($violations['undertime'] ?? []) > 0 || count($violations['missedLogs']) > 0 || ($summary['habitualTardiness'] ?? false))
    <p class="body-text">{{ $content['policyIntro'] ?? 'To remind you, below are the company policies regarding Attendance Management:' }}</p>
    @endif

    @if(count($violations['absences']) > 0)
    <div class="policy-box">
        <div class="policy-title">Policy: Absences</div>
        <p>Failure to report for work without prior approval shall be considered an unauthorized absence. Employees must secure approval before taking leave.</p>
        <p><strong>Penalties:</strong></p>
        <div class="penalties">
            <div>• <strong>1st Offense</strong> – Written Reprimand and/or 3–9 days suspension</div>
            <div>• <strong>2nd Offense</strong> – 10–30 days suspension</div>
            <div>• <strong>3rd Offense</strong> – Termination</div>
        </div>
        <p>Leave applications must be submitted at least five (5) days before the intended leave date, except for emergencies.</p>
        <p>Emergency or unplanned leave includes, but is not limited to, sudden illness, medical emergencies, accidents, death of an immediate family member, natural calamities, or other unforeseen circumstances beyond the employee’s control.</p>
        <p>To avoid violations, employees must immediately inform their supervisor of any planned or emergency absence and submit the required leave request or supporting documents as soon as possible.</p>
    </div>
    @endif

    @if(count($violations['undertime'] ?? []) > 0)
    <div class="policy-box">
        <div class="policy-title">Policy: Undertime</div>
        <p>Leaving work before the end of the scheduled shift without prior approval and valid reason is considered undertime. Employees must seek approval at least one (1) hour before leaving to ensure work operations are not disrupted and proper endorsement is made.</p>
        <p><strong>Penalties:</strong></p>
        <div class="penalties">
            <div>• <strong>1st Offense</strong> – Written Reprimand and/or 3–9 days suspension</div>
            <div>• <strong>2nd Offense</strong> – 10–30 days suspension</div>
            <div>• <strong>3rd Offense</strong> – Termination</div>
        </div>
        <p>To avoid violations, employees must secure prior approval before leaving work. In cases of emergency, immediate notification to the supervisor is required, and supporting documents must be submitted as soon as possible.</p>
    </div>
    @endif

    @if(count($violations['missedLogs']) > 0)
    <div class="policy-box">
        <div class="policy-title">Policy: Improper Logs</div>
        <p>Improper logs include missed, incomplete, or habitual failure to properly record time-in and time-out entries (AM log in/out, PM log in/out). Incorrect work location refers to logging in or out with an inaccurate geotag or reporting from a location other than the assigned work area without approval. Employees must ensure all attendance records are accurate, complete, and reflect their assigned work location.</p>
        <p><strong>Penalties:</strong></p>
        <div class="penalties">
            <div>• <strong>1st Offense</strong> – Written Reprimand and/or 3–9 days suspension</div>
            <div>• <strong>2nd Offense</strong> – 10–30 days suspension</div>
            <div>• <strong>3rd Offense</strong> – Termination</div>
        </div>
    </div>
    @endif

    @if(($summary['habitualTardiness'] ?? false))
    <div class="policy-box">
        <div class="policy-title">Policy: Habitual Tardiness</div>
        <p>Being late four (4) times beyond the prescribed grace period within a cut-off period, or accumulating a total of one (1) hour or sixty (60) minutes of tardiness within fifteen (15) days or a bi-monthly cut-off period.</p>
        <p><strong>Penalties:</strong></p>
        <div class="penalties">
            <div>• <strong>1st Offense</strong> – Written Reprimand and/or 3–9 days suspension</div>
            <div>• <strong>2nd Offense</strong> – 10–30 days suspension</div>
            <div>• <strong>3rd Offense</strong> – Termination</div>
        </div>
        <p>To avoid violations, employees are expected to manage their time properly and report to work on time. In cases of unavoidable delay, the employee must notify their supervisor at least thirty (30) minutes before their scheduled reporting time and provide a valid reason for the tardiness.</p>
    </div>
    @endif

    {{-- Closing --}}
    <p class="closing" style="white-space: pre-line; line-height: 1.5;">{{ $content['closing'] ?? '' }}</p>

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
