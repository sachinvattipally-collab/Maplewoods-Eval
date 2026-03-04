/**
 * Eligibility Engine - Pure function, runs on both backend and frontend.
 * Accepts application form data, returns rule results + overall eligibility.
 */

const ELIGIBLE_ORG_TYPES = [
  '501(c)(3)',
  '501(c)(4)',
  'Community-Based Organization',
  'Faith-Based Organization',
];

/**
 * Safely resolve a field that may be provided in snake_case (backend) or
 * camelCase (frontend). Using explicit undefined checks instead of the ||
 * operator avoids short-circuiting on falsy-but-valid values such as 0.
 */
function resolveField(snakeValue, camelValue) {
  if (snakeValue !== undefined) return snakeValue;
  if (camelValue !== undefined) return camelValue;
  return undefined;
}

function isProvided(value) {
  return value !== undefined && value !== '';
}

function checkEligibility(data) {
  const currentYear = new Date().getFullYear();
  const results = [];

  // Rule 1: Nonprofit Status
  const orgType = resolveField(data.org_type, data.orgType) || '';
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

  // Rule 2: Minimum Operating History (>= 2 years)
  const yearFoundedRaw = resolveField(data.year_founded, data.yearFounded);
  const yearFounded = parseInt(yearFoundedRaw);
  const yearsOperating = currentYear - yearFounded;
  const rule2Pass = !isNaN(yearFounded) && yearsOperating >= 2;
  results.push({
    ruleNumber: 2,
    ruleName: 'Minimum Operating History',
    pass: isProvided(yearFoundedRaw) ? rule2Pass : null,
    message: !isProvided(yearFoundedRaw)
      ? 'Enter your year founded'
      : rule2Pass
      ? `Organization has been operating for ${yearsOperating} years`
      : 'Organization must be at least 2 years old',
  });

  // Rule 3: Budget Cap (< $2,000,000)
  // NOTE: 0 is a valid budget (spec range: $0–$100M). resolveField + isProvided
  // correctly treat 0 as "provided", unlike the || operator which treats 0 as falsy.
  const annualBudgetRaw = resolveField(data.annual_budget, data.annualBudget);
  const annualBudget = parseFloat(annualBudgetRaw);
  const rule3Pass = !isNaN(annualBudget) && annualBudget < 2000000;
  results.push({
    ruleNumber: 3,
    ruleName: 'Budget Cap',
    pass: isProvided(annualBudgetRaw) ? rule3Pass : null,
    message: !isProvided(annualBudgetRaw)
      ? 'Enter your annual operating budget'
      : rule3Pass
      ? 'Operating budget is within limit'
      : 'Organizations with budgets of $2M or more are not eligible',
  });

  // Rule 4: Funding Ratio (requested <= 50% of total cost)
  const amountRequestedRaw = resolveField(data.amount_requested, data.amountRequested);
  const totalProjectCostRaw = resolveField(data.total_project_cost, data.totalProjectCost);
  const amountRequested = parseFloat(amountRequestedRaw);
  const totalProjectCost = parseFloat(totalProjectCostRaw);
  const ratio = totalProjectCost > 0 ? (amountRequested / totalProjectCost) * 100 : null;
  const rule4Pass = ratio !== null && amountRequested <= totalProjectCost * 0.5;
  const hasRule4Fields = isProvided(amountRequestedRaw) && isProvided(totalProjectCostRaw);
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

  // Rule 5: Maximum Request (<= $50,000)
  const rule5Pass = !isNaN(amountRequested) && amountRequested <= 50000;
  results.push({
    ruleNumber: 5,
    ruleName: 'Maximum Request',
    pass: isProvided(amountRequestedRaw) ? rule5Pass : null,
    message: !isProvided(amountRequestedRaw)
      ? 'Enter the amount you are requesting'
      : rule5Pass
      ? 'Requested amount is within the $50,000 maximum'
      : 'Maximum grant amount is $50,000',
  });

  // Rule 6: Minimum Impact (>= 50 beneficiaries)
  const numBeneficiariesRaw = resolveField(data.num_beneficiaries, data.numBeneficiaries);
  const numBeneficiaries = parseInt(numBeneficiariesRaw);
  const rule6Pass = !isNaN(numBeneficiaries) && numBeneficiaries >= 50;
  results.push({
    ruleNumber: 6,
    ruleName: 'Minimum Impact',
    pass: isProvided(numBeneficiariesRaw) ? rule6Pass : null,
    message: !isProvided(numBeneficiariesRaw)
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

module.exports = { checkEligibility };
