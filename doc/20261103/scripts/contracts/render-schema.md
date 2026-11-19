运行：`node scripts/render-report.mjs report.json report.html`，Node 18+、无需第三方依赖。保留 JSON。当前唯一输出协议为 `format:"amway-insight-v4", layout:"report-1027", experience:"report-reading-v6"`；输入须显式编写报告正文，生成器不从洞察条目自动推导总体判断或地区版。

## 两层内容与顶层字段

报告正文和详细洞察分别维护，通过真实 ID 关联。reportViews 保存可直接阅读的总体导语、章节导语和判断段落；issues 保存深入解释、具体证据与追问。主页面不是顺序打印 issue.summary，正文核心含义与下钻必须一致。

顶层字段：`format,layout,experience,title,summary,reportDate,reportDateKind,scopeLabel?,sourceGeographyProfile?,sources,evidence,issues,cases,categories,supplyAssessment,geographies,reportViews`。旧的 overviewItems 停用，移入各 view.overview 后重新综合。summary 是报告整体内部摘要，实际可见的整体判断为当前视图 lead 与 overview。

reportDateKind 为 meeting／material／unknown；已知用真实材料日期，unknown 时 reportDate 为空。scopeLabel 简短说明综合报告材料范围，不制造全域代表性。

## 报告正文 reportViews

每个视图包含 `id,geographyId,title,status,lead,overview,chapters`；总体可另写 regionalIssueIds。综合视图 geographyId 为 null，必须存在且唯一；地区视图填写明确地域 ID，每个地域至多一份。status 为 supported 或 insufficient。

- lead 是该视图完整的整体认识，不是卡片操作指南。supported 至少有一项 overview。
- overview 是总体判断数组；每项 `heading,text,issueIds,focus,focusReason?,focusBasis?`。heading 直接给业务判断，text 解释主要依据、关系与条件；两者均不含手动换行，连续成段；一项可关联多个真实洞察。
- chapters 恰为 situation／bottlenecks／needs／practices 四项，顺序固定；每章 `categoryId,lead,items,note?`。lead 是章级判断，items 在 overview 字段基础上必须增加 groupId，指向该章的固定二级分类。没有 items 时必须有具体 note，说明材料范围。
- chapter.items 的 issueIds 必须属于该章 categories 的洞察。总体可用跨市场主题段落关联多个详细洞察。地方独有问题可登记在总体 view.regionalIssueIds，并在对应地域正文保留明确入口；不为覆盖而在总体新增同等分量的条目，也不能只放在隐藏详情库。
- focus 为显式布尔值；为 true 时必须有 focusReason 及 focusBasis。focusBasis 为 `{explanation,evidenceIds,issueIds?}`。explanation 简述材料解释的关系、本段业务含义及仍未知或未验证之处；evidenceIds 引用支持本段解释的真实材料，不以引用数量判断完整度。不强制 situation、bottleneck、response、remainingNeed，不为通过校验补事实。筛选只取原条目子集，不重写正文。
- insufficient 只能写范围与证据缺口：overview 为空，各章 items 为空并写 note；不能同时填当地结论。

正文片段示意（仅说明字段，不是业务结论）：

```json
{"id":"global","geographyId":null,"title":"总体判断","status":"supported","lead":"基于本次材料形成的完整整体判断","overview":[{"heading":"一个完整的业务判断","text":"解释观察、关系与边界","issueIds":["i1"],"focus":true,"focusReason":"本段有据地解释了受阻动作与业务后果","focusBasis":{"explanation":"材料解释任务与支持条件的不匹配，支持尚未实施，方案效果未知","evidenceIds":["e1"]}}],"chapters":[{"categoryId":"situation","lead":"本章判断","items":[],"note":"本片段未展示实际内容"},{"categoryId":"bottlenecks","lead":"本章判断","items":[],"note":"本片段未展示实际内容"},{"categoryId":"needs","lead":"本章判断","items":[],"note":"本片段未展示实际内容"},{"categoryId":"practices","lead":"本章判断","items":[],"note":"本片段未展示实际内容"}]}
```

## 地域、覆盖与筛选

geographies 为 `[{id,name,level,parentId}]`，level 为 operation／region／city。营运区为根，片区或正式大群在 region 层；城市群归属正式片区／大群，无此中间层才直接归营运区。可运行 `node scripts/geography.mjs geographies.json` 导出[正式地域目录](../../knowledge/data/geography-catalog.json)的控件层级，不自行编组。

sources 可增加 `geographyIds:[]` 和 `respondent`：前者表示经核对的文件来源范围，后者辅助识别身份。文件名、身份和正式目录共同确定范围，不只搜索正文中的地名。已确认六份访谈可显式设置 `sourceGeographyProfile:"confirmed-six-interviews"`，使用[来源映射](../../knowledge/data/source-geography-profiles.json)。仅该材料批次启用；其他批次显式填写经核对的 geographyIds，历史负责人英文名不能自动触发映射。

issues 使用两种归属方式：

- `geographyMode:"explicit"`（默认）配合 `geographyIds`，填写实际材料明确支持的最细地域；具体城市案例采用此方式。允许跨地域，但须逐项核对来源范围、发生地与结论范围，不能把外地案例当成本地事实。
- `geographyMode:"source"` 用于尚未细分到城市的片区／大群级反馈；geographyIds 留空。生成器从该洞察引用的证据找到来源文件，解析已确认的文件范围。每份支撑材料均须有明确归属；含外地案例或范围混杂时先拆分或改为 explicit，不将整份文件的城市集合当作每条反馈的发生地。

两种方式均只向上归属：城市→所属片区／大群→营运区，片区→营运区；不生成任何下属城市归属。地方 reportViews 的每个关联洞察必须属于该范围或其下级；相应供需评估使用同一归属结果。源 JSON 保留最细归属，HTML 运行数据保存向上闭包，避免文本地名影响筛选。

有洞察材料支持的片区／大群和营运区必须显式撰写 supported 视图，其章节须保留该范围每项独立洞察的入口。生成器检查遗漏，不自动拼接报告或形成业务综合。地方正文与总体正文质量相同：有清楚判断、充分解释、当地例子与适用条件，不压成短句。未覆盖城市可不写 view，页面显示“当前材料尚不足以形成该城市群的独立判断。”不能显示为没有问题或没有需求。

全部洞察与重点洞察共用同一 reportViews 和原始段落。重点筛选按 focus 保留原条目，固定分类排序不变；空章节和对应目录项隐藏。供需评估保留当前地域全部具体需求，并标明此范围，不能让重点筛选被误读为供需表也仅保留重点条目。

## 分类、详情和供需评估

categories 继续沿用脚本 FRAMEWORK 的四章和既有二层分类，groups.issueIds 可为零、一或多项，不设一类一条。空组写 note。实践只在一个主分类完整展开，其他分类可用 crossReferences 记录关联，不在详情库复制实体。

supplyAssessment 保留 `issueId,need,supply,satisfaction,gap,urgency,basis,evidenceIds`；issueId 属于 needs，可对一个主判断评估多项具体需要。可选 satisfactionLevel 为 adequate／partial／pilot／insufficient／unknown；urgencyLevel 为 high／medium-high／medium／low／unknown；或 urgencyItems 逐项给等级。非 unknown 等级必须有证据。地域筛选同步限定表格；重点阅读筛选不删去该地域其他具体需求。

## 主判断、分支与默认依据

先登记一项完整的主判断，再安排其中实际需要的分析分支，并为每个分支选择自己的依据。分支是数据中的组织方式，不意味着页面必须多显示一层标题。

`issues[]` 只登记主判断，可增加 geographyMode 与 geographyIds 表达上述地域归属：`id,kind:"judgment",title,summary,scope,needTags,blocks,hypotheses,managementImplication,subtopics,caseLinks`。

- title 单独可读，交代对象、情况与一个核心判断；summary 在相关反馈行下解释整体逻辑，不另在展开正文开头和末尾各散落一段解释。
- scope 填本条判断的反馈来源范围，以正式城市群或片区名称呈现为标题下的“相关反馈：…”（字段值不重复前缀）。能定位城市群就写城市群，只能定位片区就写片区，不明时写“来源地域未明确”。它不代表所列地域全部城市均有同样现象；结论适用范围在标题、summary 或 Reasoning 中准确表达。名称按[地域目录](../../knowledge/data/geography-catalog.json)归一，不自造片区。
- blocks 保留整体分析及引用，至少一项 inference。不再与子判断正文重复展示；独立业务判断应另立 Insight；其解释、差异和支持材料须进入相应实际分析分支。
- managementImplication 保留规划取舍含义；相关内容应已进入 summary、子判断或有依据的动作建议，不单独渲染游离结尾。
- subtopics 是统一的内部分析分支容器，每条 Insight 至少一项，不代表必须显示 Sub-insight。共同判断下的对象、原因、阶段和组织条件可在同一分支的 blocks 中完整比较，Reasoning 内有业务解释即算覆盖；确有两个以上真实分支才增加 Sub-insight。可独立决策的业务问题另立 Insight，不为保留细节机械增加标题、分支或字段。

渲染器用 `const nested = issue.subtopics.length > 1` 决定层级，不靠 CSS 隐藏唯一子标题：

| 条件 | HTML、复制与阅读位置 |
|---|---|
| 一项 | 渲染 `.direct-analysis[data-context]`，直接 Reasoning → Evidence → Follow-up；不渲染 Sub-insight 标签、标题、details、左侧点线或空缩进，不注册 `kind:"Sub-insight"` 复制项；meta 不含 subInsight，阅读位置仅显示 Insight。 |
| 两项及以上 | 渲染 `.sub-branches` 和各 `.drill-sub` details；每项独立推理、依据、追问与复制；meta、复制及阅读位置同时带 Insight 和当前 Sub-insight。 |

单分支 title 可留作内部数据说明，但不以改写主标题的方式制造可见层级。无论是否嵌套，每个分支都形成完整的分析闭环。

结构校验只证明引用和字段合法，不证明业务覆盖。输出前按[分析质量规范](../../knowledge/K5.md) 回查重要信号是否在实际可见的 title／summary／subtopics 或具体需求中得到业务解释；总体或对应地域须有 reportViews 正文入口；仅留在不渲染的 blocks／managementImplication 或 Evidence 摘录中不算完成。

内部覆盖记录不强加为JSON字段，也不靠生成器按关键词自动分类或补洞察。

`subtopics[]` 字段示意（不是实际业务内容）：

```json
{
  "title":"谁在哪个动作上遇到了什么问题",
  "blocks":[{"kind":"inference","text":"连贯解释现象、原因和具体边界","evidenceIds":["e1","e2","e3"]}],
  "reasoningOrigin":"mixed",
  "reasoningNote":"哪些解释来自访谈，哪一步是推导，什么尚未验证",
  "primaryEvidenceIds":["e1","e2"],
  "followupQuestions":["绑定当前对象与取舍、无需新数据即可讨论的问题？","另一种探索方式，或有明确选择用途的最小验证？"],
  "caseIds":[],
  "hypothesisIndexes":[]
}
```

- blocks.kind：fact / respondent / inference / unknown。事实与受访者解释必须引用；保留具体边界，可多自然段，不强制四段模板。
- reasoningOrigin：material / respondent / inference / mixed / unknown；reasoningNote 具体说明身份与边界，可信度分为高、中、低，不将其伪装成精确概率。混合不代表所有原因均已被访谈证实。
- 分支全部 Evidence = blocks.evidenceIds、caseIds 对应案例 evidenceIds 和 hypothesisIndexes 对应假设 evidenceIds 的去重集合；不汇入其他分支的引用。
- primaryEvidenceIds 明确从这个集合选出最相关两条；只有一条填一条，确无直接材料的待验证解释填空。由分析者按支持作用选择，不按 ID、频次或关键词排序。只能支持部分内容的材料就近保留限制。
- followupQuestions 恰好两个不同且内容专属的问题：默认首问定性探索，第二问换一种方式，必要时才做有决策用途的最小验证；至少一问无需新数据。问题不能回问已有依据、空泛 brainstorm，或默认两问都是新研究任务。详细内容判法与示例统一见 insight-report.md，不按固定问题模板批量生成。

## 可选的行动建议

只有现有材料足以支持一个具体尝试时，才填写行动建议。需要分别说清尝试做什么、为什么值得试，以及观察什么结果；不要求每项判断都有建议。

仅有具体且有材料理由的尝试时添加，不要求每条都有：

```json
"suggestedAction": {
  "text":"可小范围尝试的具体动作",
  "basis":"为什么现有材料支持尝试",
  "check":"观察哪个实际行为或结果",
  "evidenceIds":["e1"]
}
```

引用来自本分析分支。text 与 check 分别写动作与观察点，避免重复。显示在 Follow-up 内，不新增主板块。不编预算、周期、政策和责任承诺，不把请求、设想或建议写成已验证方案。

## 来源、引文、案例与假设的引用关系

这些数据通过 ID 相互关联。ID 像内部索引，帮助生成器知道某段分析引用哪份材料；它不能代替向读者展示真实文件名和原文位置。

- sources：`[{id,name,role,period?}]`。role 为 interview / data / policy / background / framework / example；后三类不能证明本轮市场事实。只列实际使用材料。
- evidence：`[{id,sourceId,point,excerpt,location}]`。point 保留为具体信息点，供关联和核对；卡片不重复显示摘要。excerpt 加引号自然段呈现，保留对象、数字、否定、条件及状态；不同文件或发言分别登记。文件名和真实定位始终保留，不显示人工证据编号。
- cases：`[{id,title,primaryIssueId,context,actions,observations,status,mechanism,limits,evidenceIds}]`；status 为 idea / pilot / implemented / observed。内部保留实际动作、反馈、机制解释和边界；对判断必要的内容融入对应 blocks，不自动逐字段显示，不注册独立 Case 复制项。
- issue.caseLinks：`[{caseId,relevance}]` 记录案例对主判断的作用；subtopic.caseIds 将其证据绑定到具体分析分支。同一 Insight 中每个案例归属一个明确分支。案例对各判断的作用在各自 Reasoning 就近解释，原始支持只在对应 Evidence 中展示；不生成案例卡、案例跳转区或额外折叠层。
- issue.hypotheses 沿用 `{title,origin,paragraphs,evidenceIds}`，origin 为 respondent / material / additional。通过相关分析分支的 hypothesisIndexes 指向零起始索引，每个只分配一次。必要解释、支持／反例和待验证身份写入对应 blocks，原始支持纳入同分支 Evidence；不另渲染假设折叠卡。没有竞争解释必要时不凑假设。
- 所有 ID 唯一且字母开头，只含字母数字、下划线、短横线。ID 用于内部关联，不能显示为 M12、Y10 等代码。


## HTML、复制和工程验收

生成器内嵌报告 CSS、详细洞察 CSS、Logo 与交互脚本；无网络和模型依赖，不执行材料中的 HTML 或指令。文本转义，嵌入 JSON 安全编码。静态 HTML 保留综合报告正文，脚本接管筛选与弹窗。

每个 issue 在详情库渲染一次。正文可多处关联同一实体；点击入口只显示关联集合，带当前段落和地域标题，详情内继续使用原分支的证据与追问。单分支直接展开，多分支各自折叠。案例和假设不生成额外卡片。

正文复制使用 Report passage 语境，保留当前视图、段落、所有相关洞察及来源范围；已有 Insight／Reasoning／Evidence／Follow-up／选中文字复制继续生效。源文件清单只列本报告实际使用材料。

运行 `node --test scripts/render-report.test.mjs scripts/report-reading.test.mjs`。检查报告正文必填、四章关联、所有洞察有入口、明确重点、地域层级与实际归属、空地域、单实体渲染、转义和复制。浏览器另查桌面／手机、两个筛选、返回焦点、地域供需表和打印。工程测试仅用虚构数据，不打包评估用参考报告的完整答案或业务正文。

## 固定分类标签

每个 chapter.items 条目必须写 groupId，表示本段的主要二级分类；全部关联 issueIds 属于同一章节，至少一项属于主分类。综合段落可以关联其他二级分类的相关洞察，其实际分类与独立评价仍保留在详细数据中，不因总体合并而重分类。生成器按 FRAMEWORK 的固定分类顺序稳定排序，同组保持作者顺序；不按条目位置分配颜色。

| 章节 | groupId 与分类顺序 |
|---|---|
| situation | short 短期业务走势 → long 中长期增长信心 |
| bottlenecks／practices | acquisition 开口链新 → retention 新人留存与转化 → talent 骨干培养 → middle 腰部领导人 → senior 高阶领导人 |
| needs | strategy 战略方向层 → mechanism 机制与打法层 → execution 执行颗粒层 |

| 分类 | 背景／文字／边框 |
|---|---|
| short／mechanism | #e7effb／#235b90／#c6d8ef |
| long／strategy | #eee7f7／#644187／#d8c9e9 |
| acquisition | #e1f1ec／#24674f／#bfded1 |
| retention | #e3f1f6／#28687f／#bedbe7 |
| talent | #e8ecfa／#405996／#cbd4ee |
| middle | #fff0d8／#805514／#eed6aa |
| senior | #f1e8f6／#75478c／#dec8e8 |
| execution | #e2f1e9／#286a4a／#bfdcca |

初始 HTML 与浏览器共用 scripts/report-presentation.mjs 的段落函数，样式在 assets/report-reading.css。标签、加粗判断和解释均为行内内容，不渲染 br 或额外列表，不执行材料 HTML。

## 主题综合、地域展开与段落星标

每个 reportViews 独立维护 lead、overview 与 chapters。总体按跨市场主题综合，可一段关联多项 issueIds；地域视图可以换标题、重组和调整解释重心，不要求正文互为子集。程序不从总体正文删句生成地方正文，也不从详细洞察的星标推导综合段落星标。

总体视图可写 regionalIssueIds 数组，登记不在总体正文展开、但在地域正文有清楚入口的独立问题。每个 ID 必须真实、无重复，不与总体已关联集合重复，并实际出现在有地域依据的 reportViews 中。所有独立问题须有总体或明确地域入口，不允许用此字段把项目藏进不可达详情库；地域视图不使用该字段。

合并需求段落的 issueIds 超过一项时，填写 needMentions 数组，每项包含 issueId 和 text，逐项对应关联需求。text 是本段可见标题或解释中实际出现的具体子项名称，不能只用泛词或关联 ID 代替说明。数组不生成新模块，它校验关键子项已经写进连续正文；各需求的原分类、详细洞察和 supplyAssessment 独立保留。正文主 groupId 只负责本段的分类标签，不为合并而改写每项需求的底层归属。

focus 仍是逐段显式布尔值。为 true 时保留 focusReason 及 focusBasis.explanation、focusBasis.evidenceIds。综合段落还须填 focusBasis.issueIds，与本段关联 ID 集合完整一致，说明本段实际讨论的全部问题如何构成联系；只登记一个带星地方洞察的 ID 不通过。此集合不是要求各项分别带星，也不是用关联数量替代对综合段落本身的判断。

HTML 在 focus 为 true 的 li 上放置独立 .focus-marker，内容仅为 ★，替代原圆点；其 aria-label、title 与可聚焦提示包含统一定义。分类 .category-tag 独立保留。初始 HTML 和浏览器共用同一段落函数，全部与重点状态不改写条目或入口。供需表按地域筛选完整需求，不跟随 focus 删除行；同一段可关联多项需求，但每行的满足、缺口、紧迫度和依据仍独立。

程序仅验证显式标记、解释字段、材料引用存在及属于本段关联洞察、综合段落关联范围；不按关键词、字数、证据数量或固定环节自动判星。解释是否连贯需业务阅读。采用四字段的 focusBasis 须回看当前段落后迁移为 explanation 和 evidenceIds，须依据当前段落重新判断，不自动拼接或继承星标。
