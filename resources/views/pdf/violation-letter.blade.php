<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Attendance Violation Letter</title>
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #1e293b;
            background: white;
            margin: 0;
            padding: 15mm;
        }
        
        .letter-container {
            width: 100%;
            max-width: 100%;
        }
        
        .text-center { text-align: center; }
        .text-justify { text-align: justify; }
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mt-1 { margin-top: 0.25rem; }
        .mt-4 { margin-top: 1rem; }
        .mt-12 { margin-top: 3rem; }
        .my-6 { margin-top: 1.5rem; margin-bottom: 1.5rem; }
        .ml-4 { margin-left: 1rem; }
        .ml-6 { margin-left: 1.5rem; }
        .p-4 { padding: 1rem; }
        
        .space-y-1 > * + * { margin-top: 0.25rem; }
        .space-y-2 > * + * { margin-top: 0.5rem; }
        .space-y-4 > * + * { margin-top: 1rem; }
        .space-y-8 > * + * { margin-top: 2rem; }
        
        .flex { display: flex; }
        .gap-4 { gap: 1rem; }
        .w-24 { width: 6rem; }
        
        .border { border: 1px solid #e2e8f0; }
        .border-b { border-bottom: 1px solid #cbd5e1; }
        .border-slate-400 { border-bottom-color: #94a3b8; }
        .rounded-md { border-radius: 0.375rem; }
        .bg-slate-50 { background-color: #f8fafc; }
        
        .text-slate-900 { color: #0f172a; }
        .text-slate-700 { color: #334155; }
        .text-slate-600 { color: #475569; }
        .text-red-600 { color: #dc2626; }
        
        .list-disc { list-style-type: disc; }
        .whitespace-pre-line { white-space: pre-line; }
        .leading-relaxed { line-height: 1.625; }
        
        hr { border: 0; border-top: 1px solid #cbd5e1; }
    </style>
</head>
<body>
    <div class="letter-container">
        <!-- Title -->
        <div class="mb-6 text-center">
            <h1 class="font-bold" style="font-size: 1.5rem;">MEMORANDUM</h1>
        </div>

        <!-- Header Info -->
        <div class="mb-6 space-y-2" style="font-size: 0.875rem;">
            <div class="flex">
                <span class="w-24 font-semibold">TO:</span>
                <span>{{ $employee['name'] }} ({{ $employee['code'] }})</span>
            </div>
            <div class="flex">
                <span class="w-24 font-semibold">DEPARTMENT:</span>
                <span>{{ $employee['department'] }}</span>
            </div>
            <div class="flex">
                <span class="w-24 font-semibold">FROM:</span>
                <span>Human Resources Department</span>
            </div>
            <div class="flex">
                <span class="w-24 font-semibold">DATE:</span>
                <span>{{ $currentDate }}</span>
            </div>
            <div class="flex">
                <span class="w-24 font-semibold">SUBJECT:</span>
                <span>Attendance Violation Notice</span>
            </div>
        </div>

        <hr class="my-6" />

        <!-- Body -->
        <div class="space-y-4 leading-relaxed" style="font-size: 0.875rem;">
            <!-- Opening -->
            <p class="text-justify">
                This memorandum serves as a formal notice regarding attendance violations observed in your employment record.
            </p>

            <!-- Date Range -->
            <p>
                <span class="font-semibold">Period Covered:</span>
                {{ $dateRange['startFormatted'] }} to {{ $dateRange['endFormatted'] }}
            </p>

            <!-- Violation Breakdown -->
            <div>
                <p class="mb-3 font-semibold">The following attendance violations have been recorded:</p>
                
                <div class="space-y-4 rounded-md border bg-slate-50 p-4">

                    @php
                        $sectionNumber = 1;
                    @endphp

                    <!-- Absences -->
                    @if(count($violations['absences']) > 0)
                        <div>
                            <p class="mb-2 font-semibold text-slate-900">
                                {{ $sectionNumber }}. Absences ({{ $summary['totalAbsences'] }} {{ $summary['totalAbsences'] == 1 ? 'day' : 'days' }}):
                            </p>
                            <ul class="ml-6 list-disc space-y-1 text-slate-700">
                                @foreach($violations['absences'] as $absence)
                                    <li>{{ $absence['dateFormatted'] }} - {{ $absence['status'] }}</li>
                                @endforeach
                            </ul>
                        </div>
                        @php $sectionNumber++; @endphp
                    @endif

                    <!-- Late AM -->
                    @if(count($violations['lateAM']) > 0)
                        <div>
                            <p class="mb-2 font-semibold text-slate-900">
                                {{ $sectionNumber }}. Late Arrivals (Morning) ({{ $summary['totalLateAM'] }} {{ $summary['totalLateAM'] == 1 ? 'instance' : 'instances' }}):
                            </p>
                            <ul class="ml-6 list-disc space-y-1 text-slate-700">
                                @foreach($violations['lateAM'] as $late)
                                    <li>
                                        {{ $late['dateFormatted'] }} - 
                                        @php
                                            $hours = floor($late['minutes'] / 60);
                                            $mins = $late['minutes'] % 60;
                                            $timeStr = '';
                                            if ($hours > 0) {
                                                $timeStr = $hours . ' hour' . ($hours > 1 ? 's' : '') . ' ';
                                            }
                                            $timeStr .= $mins . ' minute' . ($mins != 1 ? 's' : '');
                                        @endphp
                                        {{ $timeStr }} late
                                        @if($late['timeIn'])
                                            <span class="text-slate-600"> (Time In: {{ $late['timeIn'] }})</span>
                                        @endif
                                    </li>
                                @endforeach
                            </ul>
                        </div>
                        @php $sectionNumber++; @endphp
                    @endif

                    <!-- Late PM -->
                    @if(count($violations['latePM']) > 0)
                        <div>
                            <p class="mb-2 font-semibold text-slate-900">
                                {{ $sectionNumber }}. Late Arrivals (Afternoon) ({{ $summary['totalLatePM'] }} {{ $summary['totalLatePM'] == 1 ? 'instance' : 'instances' }}):
                            </p>
                            <ul class="ml-6 list-disc space-y-1 text-slate-700">
                                @foreach($violations['latePM'] as $late)
                                    <li>
                                        {{ $late['dateFormatted'] }} - 
                                        @php
                                            $hours = floor($late['minutes'] / 60);
                                            $mins = $late['minutes'] % 60;
                                            $timeStr = '';
                                            if ($hours > 0) {
                                                $timeStr = $hours . ' hour' . ($hours > 1 ? 's' : '') . ' ';
                                            }
                                            $timeStr .= $mins . ' minute' . ($mins != 1 ? 's' : '');
                                        @endphp
                                        {{ $timeStr }} late
                                        @if($late['timeIn'])
                                            <span class="text-slate-600"> (Time In: {{ $late['timeIn'] }})</span>
                                        @endif
                                    </li>
                                @endforeach
                            </ul>
                        </div>
                        @php $sectionNumber++; @endphp
                    @endif

                    <!-- Missed Logs -->
                    @if(count($violations['missedLogs']) > 0)
                        <div>
                            <p class="mb-2 font-semibold text-slate-900">
                                {{ $sectionNumber }}. Missed Clock-in/Clock-out Logs ({{ $summary['totalMissedLogs'] }} {{ $summary['totalMissedLogs'] == 1 ? 'instance' : 'instances' }}):
                            </p>
                            <ul class="ml-6 list-disc space-y-1 text-slate-700">
                                @foreach($violations['missedLogs'] as $missed)
                                    <li>
                                        <div>{{ $missed['dateFormatted'] }} - {{ $missed['count'] }} {{ $missed['count'] == 1 ? 'log' : 'logs' }} missing</div>
                                        <div class="ml-4" style="font-size: 0.75rem;">
                                            <div>Time In AM: {!! $missed['timeInAM'] ? $missed['timeInAM'] : '<span class="text-red-600 font-semibold">Missed Log</span>' !!}</div>
                                            <div>Time Out Lunch: {!! $missed['timeOutLunch'] ? $missed['timeOutLunch'] : '<span class="text-red-600 font-semibold">Missed Log</span>' !!}</div>
                                            <div>Time In PM: {!! $missed['timeInPM'] ? $missed['timeInPM'] : '<span class="text-red-600 font-semibold">Missed Log</span>' !!}</div>
                                            <div>Time Out PM: {!! $missed['timeOutPM'] ? $missed['timeOutPM'] : '<span class="text-red-600 font-semibold">Missed Log</span>' !!}</div>
                                        </div>
                                    </li>
                                @endforeach
                            </ul>
                        </div>
                    @endif

                    <!-- No violations message -->
                    @if(count($violations['absences']) == 0 && count($violations['lateAM']) == 0 && count($violations['latePM']) == 0 && count($violations['missedLogs']) == 0)
                        <p style="font-size: 0.875rem; color: #166534;">No attendance violations found for this period.</p>
                    @endif
                </div>
            </div>

            <!-- Action Required -->
            <div>
                <p class="mb-2 font-semibold">Action Required:</p>
                <div class="whitespace-pre-line text-justify">You are hereby required to:
1. Report to the Human Resources office within five (5) working days from receipt of this memorandum
2. Submit a written explanation regarding the attendance violations listed above</div>
            </div>

            <!-- Closing -->
            <p class="text-justify">
                Your immediate attention to this matter is expected. Failure to comply may result in further disciplinary action in accordance with company policy.
            </p>
        </div>

        <!-- Signature Section -->
        <div class="mt-12 space-y-8">
            <div>
                <p style="font-size: 0.875rem;">Respectfully,</p>
                <div class="mt-12 border-b border-slate-400" style="width: 250px;"></div>
                <p class="mt-1 font-semibold" style="font-size: 0.875rem;">Manager Name</p>
                <p class="text-slate-600" style="font-size: 0.875rem;">Manager Title</p>
            </div>

            <div>
                <p style="font-size: 0.875rem;">Acknowledged by:</p>
                <div class="mt-12 border-b border-slate-400" style="width: 250px;"></div>
                <p class="mt-1 font-semibold" style="font-size: 0.875rem;">{{ $employee['name'] }}</p>
                <p class="text-slate-600" style="font-size: 0.875rem;">Employee</p>
                <div class="mt-4 flex gap-4">
                    <div>
                        <span style="font-size: 0.875rem;">Date: </span>
                        <span class="inline-block border-b border-slate-400" style="width: 150px;"></span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
