# 学术网站与 CV 的维护

`data/academic.json` 是学术资料的唯一维护入口。页面模板保留现有主题，生成后的 HTML 可直接由 GitHub Pages 托管，不需要浏览器端 JavaScript 加载资料。

## 更新流程

1. 修改 `data/academic.json`，不要分别编辑生成的网页或 CV 章节。
2. 使用 Python 3 和已安装的 XeLaTeX / latexmk，运行：

   ```powershell
   python scripts/build_academic.py --cv-dir "D:/LocalTree/Yunze Xiao_CV"
   ```

   Python 构建脚本只使用标准库。若系统没有 `python` 命令，可用本机已有的 Python 可执行文件替换它。

3. 同步检查：

   ```powershell
   python scripts/build_academic.py --check --cv-dir "D:/LocalTree/Yunze Xiao_CV"
   ```

4. 查看本地网页及 PDF 后，按原有 GitHub Pages 工作流提交和发布。这两个命令都不会提交、推送或发布。

构建会生成首页、Research、三个研究详情页、Writing、Publications、CV、Teaching 与 News，并保留 `/projects/` 及其原有锚点；将学术章节写入指定的现有 LaTeX CV 工程，重新编译，并复制 PDF 到网站下载位置。不会改动 `professional.tex`、未启用的 honors 或其他私人材料。现有 CV 排版类和字体继续由 CV 工程维护。

只改模板或 CSS 时，可运行 `python scripts/build_academic.py`。如果学术数据变动或 PDF 被单独替换，脚本会要求使用 `--cv-dir`，防止新网页搭配旧 PDF。`data/build-manifest.json` 保存数据与 PDF 的摘要，用于检查是否同步；不要手动修改。

## 数据字段

- `education`：学历及导师；`status` 与 `end` 必须一致。在读使用 `in_progress` 和 `null`，毕业后使用 `completed` 和实际结束月份。首页身份介绍和 CV 日期由这组字段共同生成。
- `research_interests`、`research`：研究主线与经历。
- `publications`：稳定的 `key`、完整 `authors`、年份、标题、链接、venue、`published` / `preprint` 分类，以及可选摘要和资源。不要修改已有 `key`；编号由分类内顺序生成。新论文按照年份放入对应位置。
- `selected_publications`、`findings`：首页代表作及一句话研究结论。观点论文应明确写为主张，而非已证实的实验结果。
- `projects`：研究问题、发现、方法、已确认的个人角色、代码或演示链接。没有核实的代码地址留空，不填占位链接。
- `mentoring`、`teaching`、`service`、`talks`：共同生成网页与 CV。`additional_mentoring` 保留旧网站已有的其他指导记录，仅显示在网站。
- `news`、`calendar`：网站动态与折叠日历。新增 news 放在列表最前面；首页展示前三条。
- `website`：研究问题、论文主题关联、简短标题、研究阅读提示与 Writing 入口。论文可以属于多个主题；尚未覆盖的论文仍出现在全部论文中。研究事实仍引用同一份 `publications`、`projects` 和 `findings`。

为了保留论文和 CV 的排版，部分文本字段支持有限 LaTeX 标记：`\textbf{}`、`\textit{}`、`\href{url}{label}`、`\pubref{key}`、`\mbox{}`、`\newline`、`\&` 等。JSON 中反斜线须写两次；未知命令会报错，不会默默删除内容。普通姓名和主题字段使用正常文字。

论文的长期链接使用 `/publications/#paper-<key>`，其中非字母数字字符转换为 `-`。当前旧编号链接和原有论文锚点仍保留，新增链接请优先使用稳定 key。

## 排版与检查

模板在 `templates/home.html`、`templates/page.html`，学术页面样式在 `assets/css/academic.css`。`scripts/research_site.py` 生成研究阅读路径；`assets/js/research.js` 渐进增强检索、引用复制与互动实验。生成器检查站内链接、锚点、重复 ID、未填模板、论文 key 和 PDF 来源版本。PDF 编译失败或出现引用/溢出警告时，不会替换网页和网站下载文件；修正后重新运行。

互动实验放在 Chameleon 详情页，首页只保留入口。使用 24 个固定的合成人物和两个独立控制量，只解释“人设匹配与额外行为维度上的多样性需要分别评价”。不展示论文实验分数，不调用模型。网址中的 `labf` / `labd` 可分享状态；论文页的 `q` / `topic` / `status` 可分享检索条件。关闭 JavaScript 后保留全部论文、研究内容及实验的静态说明。检查交互逻辑可运行 `node scripts/test_research.js`，内容同步回归检查运行 `python scripts/test_academic.py`。

生成器会改写上述学术 CV 章节；如需调整排版，应修改生成器的 `cv_files()` 或 CV 的排版类，不要直接修改生成章节。个人贡献只录入本人确认的信息。硕士状态当前沿用本轮 CV 的在读信息；如确认 May 2026 已毕业，请在学历数据中统一修正。
# Citation counts and BibTeX

`data/citations.json` contains only Google Scholar counts. The verified profile is https://scholar.google.com/citations?user=95n7XTkAAAAJ&hl=en. `data/google-scholar.json` preserves the public browser snapshot, retrieval timestamp, profile total, complete expanded article list, and separately verified records. Refresh the visible Scholar profile with Show more until disabled, record the table and any separately verified searches, then run `python scripts/update_citations.py` and `python scripts/build_academic.py`. The importer matches normalized titles or explicitly verified article links; it rejects a wrong profile or incomplete list. Missing matches remain unavailable; an indexed profile row with an empty Cited by cell means zero displayed citations. Scholar asterisks are preserved. The headline is the profile total, which may include papers outside this site's selected list; never derive it by adding the listed rows. The build rejects a non-Scholar citation source. A failed refresh must leave the last verified, dated snapshot intact; there is no provider fallback.

BibTeX is generated from the canonical full author lists, titles, years, venues and URLs. Each publication has an `assets/bib/paper-*.bib` download, and `assets/bib/yunze-xiao.bib` contains the full list. Equal-contribution markers are omitted from machine-readable author names. These minimal exports retain the known fields; they do not invent page ranges or other publisher metadata.

## Publication tags

`data/publication-tags.json` maintains ten website-only topics separately from the CV facts. Assign each paper 1–3 directly supported topics using its stable publication key. The Publications page presents clickable topic buttons above search and status controls; clicking an active topic clears it. Paper tags select the same filter, and search includes visible tag labels. The `aliases` map redirects retired granular tags and former research-theme URLs to their closest current topic. New topic slugs must not collide with aliases. Rebuild with `python scripts/build_academic.py` after editing tags.
