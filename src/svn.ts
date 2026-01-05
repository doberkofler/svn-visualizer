import {spawn} from 'node:child_process';
//import {z} from 'zod';

/**
 * SVN export parameters
 */
export type SvnExportParams = {
	url: string;
	username: string;
	password: string;
	startDate: Date;
	endDate: Date;
};

/**
 * Execute SVN log command and return XML output
 */
export async function exportSvnLog(params: SvnExportParams): Promise<string> {
	const startRevision = `{${params.startDate.toISOString()}}`;
	const endRevision = `{${params.endDate.toISOString()}}`;

	const args = [
		'log',
		params.url,
		'--xml',
		'--verbose',
		'--revision',
		`${startRevision}:${endRevision}`,
		'--username',
		params.username,
		'--password',
		params.password,
		'--non-interactive',
		'--trust-server-cert-failures',
		'unknown-ca,cn-mismatch,expired,not-yet-valid,other',
	];

	return new Promise<string>((resolve, reject) => {
		const proc = spawn('svn', args);
		let stdout = '';
		let stderr = '';

		proc.stdout.on('data', (data: Buffer) => {
			stdout += data.toString();
		});

		proc.stderr.on('data', (data: Buffer) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(`SVN command failed with code ${code}: ${stderr}`));
				return;
			}
			resolve(stdout);
		});

		proc.on('error', (err) => {
			reject(new Error(`Failed to spawn SVN process: ${err.message}`));
		});
	});
}
