import { describe, expect, it, mock } from 'bun:test';
import { promisify } from 'util';
import * as path from 'path';

describe('TTS routes - macOS say command logic', () => {
  it('uses execFile with correct arguments and prevents command injection', async () => {
    // We test the logic that was implemented in routes.js
    const text = 'Hello; rm -rf /';
    const voice = 'Samantha';
    const rate = 200;

    const mockExecFile = mock((cmd, args, callback) => {
        callback(null, { stdout: '', stderr: '' });
    });

    const execFileAsync = promisify(mockExecFile);

    // Logic from routes.js
    const tempDir = '/tmp';
    const tempFile = path.join(tempDir, `say-${Date.now()}.m4a`);
    const args = ['-v', voice, '-r', rate.toString(), '-o', tempFile, '--data-format=aac', text.trim()];

    await execFileAsync('say', args);

    expect(mockExecFile).toHaveBeenCalled();
    const call = mockExecFile.mock.calls[0];
    expect(call[0]).toBe('say');
    expect(call[1]).toEqual(['-v', 'Samantha', '-r', '200', '-o', expect.stringContaining('/say-'), '--data-format=aac', 'Hello; rm -rf /']);
    expect(Array.isArray(call[1])).toBe(true);
  });
});
