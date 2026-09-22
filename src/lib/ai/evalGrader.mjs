function normalize(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim()
}

function includesAny(text, phrases) {
  const haystack = normalize(text)
  return (phrases || []).some((phrase) => haystack.includes(normalize(phrase)))
}

function excludesAll(text, phrases) {
  const haystack = normalize(text)
  return (phrases || []).every((phrase) => !haystack.includes(normalize(phrase)))
}

function excludesRegex(text, patterns) {
  const value = String(text || "")
  return (patterns || []).every((pattern) => {
    try {
      return !new RegExp(pattern, "i").test(value)
    } catch {
      return true
    }
  })
}

function gradeCheck(answer, check) {
  if (check.type === "any") {
    return includesAny(answer, check.phrases)
  }

  if (check.type === "none") {
    return excludesAll(answer, check.phrases)
  }

  if (check.type === "none_regex") {
    return excludesRegex(answer, check.patterns)
  }

  if (check.type === "all_groups") {
    return (check.groups || []).every((group) => includesAny(answer, group))
  }

  return false
}

export function gradeEvalAnswer(evalCase, answer) {
  const checks = (evalCase?.checks || []).map((check) => {
    const passed = gradeCheck(answer, check)
    return {
      id: check.id,
      label: check.label,
      critical: check.critical === true,
      passed,
    }
  })

  const passedChecks = checks.filter((check) => check.passed).length
  const totalChecks = checks.length
  const criticalFailures = checks.filter(
    (check) => check.critical && !check.passed,
  )

  const ratio = totalChecks ? passedChecks / totalChecks : 0
  const minimumRatio = Number(evalCase?.minimumRatio ?? 0.75)

  return {
    passed:
      totalChecks > 0 &&
      criticalFailures.length === 0 &&
      ratio >= minimumRatio,
    passedChecks,
    totalChecks,
    ratio,
    criticalFailures: criticalFailures.map((check) => check.id),
    checks,
  }
}

export function summarizeEvalResults(results) {
  const rows = Array.isArray(results) ? results : []
  const completed = rows.filter((row) => row.status === "complete")
  const passed = completed.filter((row) => row.grade?.passed === true)
  const criticalFailures = completed.filter(
    (row) => (row.grade?.criticalFailures || []).length > 0,
  )

  return {
    total: rows.length,
    completed: completed.length,
    passed: passed.length,
    failed: completed.length - passed.length,
    criticalFailures: criticalFailures.length,
    passRate:
      completed.length > 0 ? passed.length / completed.length : null,
  }
}
