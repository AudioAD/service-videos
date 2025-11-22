import { camelCase } from "scule";
import importsHelper from "./importsHelper";

//https://nitro.unjs.io/config
export default defineNitroConfig({
	inlineDynamicImports: true,
	srcDir: "server",
	compatibilityDate: "2025-01-26",
	runtimeConfig: {
		mongoUri: "mongodb://root:donotusemyrootpassword@localhost:27017/",
		secret: "gurievcreative",
	},
	imports: {
		imports: [
			...(await importsHelper("./db/model")),
			...(await importsHelper("./db/schema", camelCase)),
		],
		presets: [
			{
				from: "zod",
				imports: ["z"],
			},
		],
		dirs: ["./server/utils", "./types"],
	},
});
