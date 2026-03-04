function calculateAward(data) {
  const currentYear = new Date().getFullYear();
  const scores = {};
  const reasons = {};

  const beneficiaries = parseInt(data.num_beneficiaries);
  if (beneficiaries >= 1001) { scores.communityImpact = 3; }
  else if (beneficiaries >= 201) { scores.communityImpact = 2; }
  else { scores.communityImpact = 1; }
  reasons.communityImpact = `${beneficiaries.toLocaleString()} beneficiaries`;

  const yearsOperating = currentYear - parseInt(data.year_founded);
  if (yearsOperating >= 16) { scores.trackRecord = 3; }
  else if (yearsOperating >= 6) { scores.trackRecord = 2; }
  else { scores.trackRecord = 1; }
  reasons.trackRecord = `${yearsOperating} years operating`;

  const category = data.project_category;
  if (category === 'Public Health' || category === 'Neighborhood Safety') { scores.categoryPriority = 3; }
  else if (category === 'Youth Programs' || category === 'Senior Services') { scores.categoryPriority = 2; }
  else { scores.categoryPriority = 1; }
  reasons.categoryPriority = category;

  const budget = parseFloat(data.annual_budget);
  if (budget < 100000) { scores.financialNeed = 3; }
  else if (budget <= 499999) { scores.financialNeed = 2; }
  else { scores.financialNeed = 1; }
  reasons.financialNeed = `$${budget.toLocaleString()} budget`;

  const amountRequested = parseFloat(data.amount_requested);
  const totalCost = parseFloat(data.total_project_cost);
  const costRatio = (amountRequested / totalCost) * 100;
  if (costRatio <= 25) { scores.costEfficiency = 3; }
  else if (costRatio <= 40) { scores.costEfficiency = 2; }
  else { scores.costEfficiency = 1; }
  reasons.costEfficiency = `${costRatio.toFixed(1)}% of project cost`;

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const awardPercentage = totalScore / 15;
  const rawAward = amountRequested * awardPercentage;
  const roundedAward = Math.round(rawAward / 100) * 100;
  const finalAward = Math.min(roundedAward, 50000);

  return {
    breakdown: [
      { factor: 'Community Impact', score: scores.communityImpact, maxScore: 3, reason: reasons.communityImpact },
      { factor: 'Track Record', score: scores.trackRecord, maxScore: 3, reason: reasons.trackRecord },
      { factor: 'Category Priority', score: scores.categoryPriority, maxScore: 3, reason: reasons.categoryPriority },
      { factor: 'Financial Need', score: scores.financialNeed, maxScore: 3, reason: reasons.financialNeed },
      { factor: 'Cost Efficiency', score: scores.costEfficiency, maxScore: 3, reason: reasons.costEfficiency },
    ],
    totalScore,
    maxScore: 15,
    awardPercentage: Math.round(awardPercentage * 1000) / 10,
    amountRequested,
    rawAward,
    roundedAward,
    finalAward,
  };
}

module.exports = { calculateAward };
