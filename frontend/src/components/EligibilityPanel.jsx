import { checkEligibility } from '../services/eligibilityEngine';

export default function EligibilityPanel({ formData }) {
  const result = checkEligibility(formData);
  const allNull = result.rules.every(r => r.pass === null);
  const pct = Math.round((result.score / 6) * 100);

  return (
    <div className="eligibility-panel">
      <div className="eligibility-panel-header">
        <span style={{ fontSize: 18 }}>🛡️</span>
        <h3 className="eligibility-title">Eligibility Check</h3>
      </div>

      {/* Progress bar */}
      <div className="eligibility-progress">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>Criteria Met</span>
          <span style={{ color: result.overallEligible ? 'var(--success)' : result.score > 0 ? 'var(--warning)' : 'var(--neutral)' }}>
            {result.score} / 6
          </span>
        </div>
        <div className="eligibility-progress-bar">
          <div
            className="eligibility-progress-fill"
            style={{
              width: `${pct}%`,
              background: result.overallEligible
                ? 'linear-gradient(90deg, #1A652A, #22c55e)'
                : result.score >= 4
                ? 'linear-gradient(90deg, #D4760A, #f59e0b)'
                : result.score > 0
                ? 'linear-gradient(90deg, #993333, #ef4444)'
                : '#E2E8F0'
            }}
          />
        </div>
      </div>

      {/* Overall summary */}
      <div className={`eligibility-summary ${result.overallEligible ? 'eligible' : result.score > 0 ? 'partial' : 'not-eligible'}`}>
        {allNull
          ? '⬜ Fill in the form to check eligibility'
          : result.overallEligible
          ? '✅ Eligible — All 6 criteria met'
          : `❌ Not Eligible — ${result.score} of 6 criteria met`}
      </div>

      {/* Rules list */}
      <ul className="eligibility-rules">
        {result.rules.map((rule) => (
          <li
            key={rule.ruleNumber}
            className={`eligibility-rule ${rule.pass === true ? 'pass' : rule.pass === false ? 'fail' : 'neutral'}`}
          >
            <span className="rule-icon">
              {rule.pass === true ? '✅' : rule.pass === false ? '❌' : '⬜'}
            </span>
            <div className="rule-text">
              <div className="rule-name">{rule.ruleName}</div>
              <div className="rule-message">{rule.message}</div>
            </div>
          </li>
        ))}
      </ul>

      {!result.overallEligible && result.score > 0 && (
        <p className="eligibility-note">
          You may still submit. The reviewer makes the final determination.
        </p>
      )}
    </div>
  );
}
