import * as fs from "fs";
import path from "path";

const copyTemplateAsset = async (
  templateDirectory: string,
  outDirectory: string,
  sourceName: string,
  targetName = sourceName,
) => {
  const sourcePath = path.join(templateDirectory, sourceName);
  const targetPath = path.join(outDirectory, targetName);

  await fs.promises.copyFile(sourcePath, targetPath);
};

export const generateHTML = async (outDir?: string) => {
  const targetOutDir = outDir ?? path.join(process.cwd(), "dist");
  const templateDirectory = path.join(__dirname, "..", "templates");

  await fs.promises.mkdir(targetOutDir, { recursive: true });

  await Promise.all([
    copyTemplateAsset(templateDirectory, targetOutDir, "template.html", "index.html"),
    copyTemplateAsset(templateDirectory, targetOutDir, "main.css"),
    copyTemplateAsset(templateDirectory, targetOutDir, "catalog.js"),
  ]);
};
