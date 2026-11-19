版本 insight-workflow-v1。原始 report 数据与 workflow 一起保存，不覆盖原文。

## S1
information[]: id, type, statement, region, topic, object, sourceId, evidenceIds, speaker(可空), time(可空), context, normalizationStatus；每项是可独立核对的信息点，不把多种身份合成事实。

## S2
candidate.performance: metric, value(原文有则填), period, unit, denominator, population, contribution, outlook, assumptions, risks；与 candidate.id、informationIds、evidenceIds 关联。

## S3
candidate: id, title, judgment, businessProblem, cause, impact, object, scope, interpretationOrigin, alternatives[], limits[], unknowns[], informationIds[], evidenceIds[]；因果链每一环可追溯，未知显式保留。

## S4
candidate.comparison[]: sourceId, region, position(support/different/counter/not-mentioned), observation, explanation, evidenceIds；independentSupportCount、uncoveredScope、commonalityBasis 不以文件重复次数代替。

## S5
candidate.practice: goal, startingPoint, actions, roles, status, observations, mechanism, limits, transferConditions, unverifiedEffects, evidenceIds；关键动作及条件须在实际可读解释中出现。

## S6
candidate.demands[]: object, task, level, requestOrigin, existingSupply, satisfaction, gap, urgency, basis, evidenceIds；同一洞察可有多项独立需求，未知分别记录。

## S7
assessment: insightId, D[5], depthReasons[5], C[6], completenessReasons[6], factConfidence, causalConfidence, confidenceBasis, tags[], independentSupportCount, counterexamples, uncoveredScope, P[5], priorityReasons[5], hasCausalExplanation, causalEvidenceSupported, transferConditionsSpecified, missingConditions, validationQuestions, evidenceIds, reviewStatus；calculateAssessment 输出 D、L、C 总分、P、优先级、四类建议及封顶原因。

## S8
report: amway-insight-v4 / report-1027 / report-reading-v6 数据及 workflow:{version,information,candidates,assessments}；附完整来源、原文映射、评估登记册和离线 HTML。reportViews 的 overview/重点显著性由 S7 与当前段落业务解释共同确定，四章细节不得因筛选而删除。

## 状态和一致性
information、candidate 与 assessment 各自 ID 唯一；candidate.informationIds 与 evidenceIds 必须存在，assessment.insightId 恰对应一项 candidate，报告全部 issues 都有候选与评估去向；进入报告的候选不是全部候选的替代。尚未评分使用 reviewStatus=pending，不生成默认数字。历史迁移使用 origin=migrated，原文来源及重建方式明示；新执行使用 origin=agent。

评估可 reviewStatus=provisional 或 reviewed；只有人工或 Agent 实际逐项完成证据核查时才标 reviewed。历史证据分类由规则辅助标为待复核，不宣称生成时已保存了这些步骤。

## 管理行为
Skills 与 Knowledge 可查看完整正文、关联和文件位置，搜索、下载模块或整个 JSON，导入本地规则包用于浏览。离线预览修改不会覆盖磁盘或自动影响 Agent；导出的配置须经维护者写回对应文件后，下一次运行才读取。评分工作表可改 D/C/P 并立即重算；保存下载登记册，不自动改写报告正文或原始文件。
