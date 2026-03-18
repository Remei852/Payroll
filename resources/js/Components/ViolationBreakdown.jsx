export default function ViolationBreakdown({ violations, summary }) {
    const formatMinutes = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
        }
        return `${mins} minute${mins !== 1 ? 's' : ''}`;
    };

    const hasViolations = 
        violations.absences.length > 0 ||
        violations.lateAM.length > 0 ||
        violations.latePM.length > 0 ||
        violations.missedLogs.length > 0;

    if (!hasViolations) {
        return (
            <div className="rounded-md border border-green-200 bg-green-50 p-4">
                <p className="text-sm text-green-800">No attendance violations found for this period.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
            {/* Absences */}
            {violations.absences.length > 0 && (
                <div>
                    <p className="mb-2 font-semibold text-slate-900">
                        1. Absences ({summary.totalAbsences} {summary.totalAbsences === 1 ? 'day' : 'days'}):
                    </p>
                    <ul className="ml-6 list-disc space-y-1 text-slate-700">
                        {violations.absences.map((absence, idx) => (
                            <li key={idx}>
                                {absence.dateFormatted} - {absence.status}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Late AM */}
            {violations.lateAM.length > 0 && (
                <div>
                    <p className="mb-2 font-semibold text-slate-900">
                        {violations.absences.length > 0 ? '2' : '1'}. Late Arrivals (Morning) ({summary.totalLateAM} {summary.totalLateAM === 1 ? 'instance' : 'instances'}):
                    </p>
                    <ul className="ml-6 list-disc space-y-1 text-slate-700">
                        {violations.lateAM.map((late, idx) => (
                            <li key={idx}>
                                {late.dateFormatted} - {formatMinutes(late.minutes)} late
                                {late.timeIn && <span className="text-slate-600"> (Time In: {late.timeIn})</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Late PM */}
            {violations.latePM.length > 0 && (
                <div>
                    <p className="mb-2 font-semibold text-slate-900">
                        {[violations.absences.length > 0, violations.lateAM.length > 0].filter(Boolean).length + 1}. Late Arrivals (Afternoon) ({summary.totalLatePM} {summary.totalLatePM === 1 ? 'instance' : 'instances'}):
                    </p>
                    <ul className="ml-6 list-disc space-y-1 text-slate-700">
                        {violations.latePM.map((late, idx) => (
                            <li key={idx}>
                                {late.dateFormatted} - {formatMinutes(late.minutes)} late
                                {late.timeIn && <span className="text-slate-600"> (Time In: {late.timeIn})</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Missed Logs */}
            {violations.missedLogs.length > 0 && (
                <div>
                    <p className="mb-2 font-semibold text-slate-900">
                        {[violations.absences.length > 0, violations.lateAM.length > 0, violations.latePM.length > 0].filter(Boolean).length + 1}. Missed Clock-in/Clock-out Logs ({summary.totalMissedLogs} {summary.totalMissedLogs === 1 ? 'instance' : 'instances'}):
                    </p>
                    <ul className="ml-6 list-disc space-y-1 text-slate-700">
                        {violations.missedLogs.map((missed, idx) => (
                            <li key={idx}>
                                <div>{missed.dateFormatted} - {missed.count} {missed.count === 1 ? 'log' : 'logs'} missing</div>
                                <div className="ml-4 text-sm text-slate-600">
                                    <div>Time In AM: {missed.timeInAM ? missed.timeInAM : <span className="text-red-600 font-semibold">Missed Log</span>}</div>
                                    <div>Time Out Lunch: {missed.timeOutLunch ? missed.timeOutLunch : <span className="text-red-600 font-semibold">Missed Log</span>}</div>
                                    <div>Time In PM: {missed.timeInPM ? missed.timeInPM : <span className="text-red-600 font-semibold">Missed Log</span>}</div>
                                    <div>Time Out PM: {missed.timeOutPM ? missed.timeOutPM : <span className="text-red-600 font-semibold">Missed Log</span>}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
