import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


class ResumeStudioStaticTests(unittest.TestCase):
    def test_strict_typescript_contract(self):
        config=json.loads((ROOT/"tsconfig.json").read_text(encoding="utf-8"))
        self.assertTrue(config["compilerOptions"]["strict"])
        self.assertTrue(config["compilerOptions"]["noUncheckedIndexedAccess"])
        model=(ROOT/"src"/"model.ts").read_text(encoding="utf-8")
        for name in ["ResumeDocument","ResumeProfile","ResumeSection","ResumeEntry","validateResume"]:
            self.assertIn(name,model)

    def test_requested_editor_export_and_layout_surfaces(self):
        html=(ROOT/"index.html").read_text(encoding="utf-8")
        for marker in ['id="json-editor"','id="section-list"','id="layout"','id="save"','id="copy"','id="download"','id="import"','id="print"']:
            self.assertIn(marker,html)
        self.assertIn("Content-Security-Policy",html)

    def test_print_to_pdf_and_responsive_styles(self):
        css=(ROOT/"styles.css").read_text(encoding="utf-8")
        self.assertIn("@media print",css)
        self.assertIn("@page",css)
        self.assertIn("@media(max-width:900px)",css)


if __name__=="__main__": unittest.main()
