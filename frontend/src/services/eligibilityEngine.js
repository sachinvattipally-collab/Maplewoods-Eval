/**
 * Eligibility Engine — Frontend copy (mirrors backend logic exactly).
 * Runs in real-time as applicant fills the form.
 */

const ELIGIBLE_ORG_TYPES = [
  '501(c)(3)',
  '501(c)(4)',
  'Community-Based Organization',
  'Faith-Based Organization',
];

function isProvided(value) {
  return value !== undefined && value !== '';
}

export function checkEligibility(data) {
  const currentYear = new Date().getFullYear();
  const results = [];

  // Rule 1: Nonprofit Status
  const orgType = data.orgType || '';
  const rule1Pass = ELIGIBLE_ORG_TYPES.includes(orgType);
  results.push({
    ruleNumber: 1,
    ruleName: 'Nonprofit Status',
    pass: orgType ? rule1Pass : null,
    message: !orgType
      ? 'Select your organization type'
      : rule1Pass
      ? 'Eligible organization type'
      : 'Only nonprofit and community organizations are eligible',
  });

  // Rule 2: Minimum Operating History
  const yearFounded = parseInt(data.yearFounded);
  const yearsOperating = currentYear - yearFounded;
  const rule2Pass = !isNaN(yearFounded) && yearsOperating >= 2;
  results.push({
    ruleNumber: 2,
    ruleName: 'Minimum Operating History',
    pass: isProvided(data.yearFounded) ? rule2Pass : null,
    message: !isProvided(data.yearFounded)
      ? 'Enter your year founded'
      : rule2Pass
      ? `Organization has been operating for ${yearsOperating} years`
      : 'Organization must be at least 2 years old',
  });

  // Rule 3: Budget Cap
  // NOTE: 0 is a valid budget. isProvided() correctly treats 0 as a provided
  // value, unlike a bare || check which would short-circuit on 0 (falsy).
  const annualBudget = parseFloat(data.annualBudget);
  const rule3Pass = !isNaN(annualBudget) && annualBudget < 2000000;
  results.push({
    ruleNumber: 3,
    ruleName: 'Budget Cap',
    pass: isProvided(data.annualBudget) ? rule3Pass : null,
    message: !isProvided(data.annualBudget)
      ? 'Enter your annual operating budget'
      : rule3Pass
      ? 'Operating budget is within limit'
      : 'Organizations with budgets of $2M or more are not eligible',
  });

  // Rule 4: Funding Ratio
  const amountRequested = parseFloat(data.amountRequested);
  const totalProjectCost = parseFloat(data.totalProjectCost);
  const ratio = totalProjectCost > 0 ? (amountRequested / totalProjectCost) * 100 : null;
  const rule4Pass = ratio !== null && amountRequested <= totalProjectCost * 0.5;
  const hasRule4Fields = isProvided(data.amountRequested) && isProvided(data.totalProjectCost);
  results.push({
    ruleNumber: 4,
    ruleName: 'Funding Ratio',
    pass: hasRule4Fields ? rule4Pass : null,
    message: !hasRule4Fields
      ? 'Enter requested amount and total project cost'
      : rule4Pass
      ? `Requested amount is ${ratio.toFixed(1)}% of project cost`
      : 'Requested amount cannot exceed 50% of total project cost',
  });

  // Rule 5: Maximum Request
  const rule5Pass = !isNaN(amountRequested) && amountRequested <= 50000;
  results.push({
    ruleNumber: 5,
    ruleName: 'Maximum Request',
    pass: isProvided(data.amountRequested) ? rule5Pass : null,
    message: !isProvided(data.amountRequested)
      ? 'Enter the amount you are requesting'
      : rule5Pass
      ? 'Requested amount is within the $50,000 maximum'
      : 'Maximum grant amount is $50,000',
  });

  // Rule 6: Minimum Impact
  const numBeneficiaries = parseInt(data.numBeneficiaries);
  const rule6Pass = !isNaN(numBeneficiaries) && numBeneficiaries >= 50;
  results.push({
    ruleNumber: 6,
    ruleName: 'Minimum Impact',
    pass: isProvided(data.numBeneficiaries) ? rule6Pass : null,
    message: !isProvided(data.numBeneficiaries)
      ? 'Enter estimated number of beneficiaries'
      : rule6Pass
      ? `Project will serve ${numBeneficiaries} beneficiaries`
      : 'Project must serve at least 50 beneficiaries',
  });

  const passedRules = results.filter((r) => r.pass === true);
  const score = passedRules.length;
  const overallEligible = score === 6;

  return {
    rules: results,
    score,
    overallEligible,
    summary: overallEligible
      ? 'Eligible — All 6 criteria met'
      : `Not Eligible — ${score} of 6 criteria met`,
  };
}
