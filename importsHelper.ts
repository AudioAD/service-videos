import { globby } from "globby";
import { basename, dirname, extname, join } from "pathe";
import { pascalCase } from "scule";

const GLOB_SCAN_PATTERN = "*.{js,mjs,cjs,ts,mts,cts,tsx,jsx}";

const importsHelper = async (
	dir: string,
	nameNormalizeFn: (str: string) => string = pascalCase,
) => {
	const fileNames = await globby(join(dir, GLOB_SCAN_PATTERN), {
		cwd: "./",
		dot: true,
		absolute: true,
	});
	return fileNames.map((fullPath) => ({
		name: "default",
		as: nameNormalizeFn(
			[basename(dirname(fullPath)), basename(fullPath, extname(fullPath))].join(
				"-",
			),
		),
		from: fullPath,
	}));
};

export default importsHelper;
