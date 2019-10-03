interface Config {
	port: number
	baseUrl: string
	viewDir: string
	layoutDir: string
}

const viewDir = `${__dirname}/views`;

const config:Config = {
	port: 22300,
	baseUrl: '',
	viewDir: viewDir,
	layoutDir: `${viewDir}/layouts`,
};

export default config;
