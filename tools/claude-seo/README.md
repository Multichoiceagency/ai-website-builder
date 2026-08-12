# Claude SEO toolkit (reference)

Upstream: [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) (MIT).

This folder keeps attribution for methodology used by the platform SEO network
(`services/core-api/src/lib/seo/network*.ts`) and Growth → SEO partner backlinks:

- Branded / partial-match anchors (not exact-match spam)
- Capped outbound degree
- Reciprocal edges where capacity allows
- Eligibility: public hostname + published pages + indexing on

Local full toolkit (skills, Python scripts for Moz / Bing / Common Crawl):

```
/Users/multichoiceagency/Downloads/claude-seo-main
```

Install for Claude Code agents:

```bash
bash /Users/multichoiceagency/Downloads/claude-seo-main/install.sh
```

Do not vendor the full Python plugin into Coolify images unless a dedicated
SEO worker is added — the live product path is the TypeScript network above.
