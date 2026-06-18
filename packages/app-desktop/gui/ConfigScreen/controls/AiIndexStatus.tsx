import * as React from 'react';
import { useEffect, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import EmbeddingIndexer from '@joplin/lib/services/ai/EmbeddingIndexer';
import { IndexStatus } from '@joplin/lib/services/ai/types';

// Live status panel under the "Enable AI features" toggle. Polls
// EmbeddingIndexer.getStatus() while the AI section is visible.
const POLL_INTERVAL_MS = 2000;

const modelStatusLabel = (s: IndexStatus['modelDownloadStatus']) => {
	switch (s) {
	case 'not-started': return _('Not started');
	case 'downloading': return _('Downloading…');
	case 'downloaded': return _('Downloaded');
	case 'unavailable': return _('Unavailable on this platform');
	}
};

const indexerStateLabel = (s: IndexStatus['indexerState']) => {
	switch (s) {
	case 'idle': return _('Idle');
	case 'running': return _('Indexing…');
	case 'ai-disabled': return _('AI is disabled');
	case 'index-disabled': return _('Indexing is disabled');
	}
};

const AiIndexStatus = () => {
	const [status, setStatus] = useState<IndexStatus | null>(null);

	useEffect(() => {
		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | null = null;
		// Chained setTimeout, not setInterval — keeps polls from stacking up
		// when getStatus() is slow (e.g. competing with the model load).
		const tick = async () => {
			try {
				const s = await EmbeddingIndexer.instance().getStatus();
				if (!cancelled) setStatus(s);
			} catch {
				// Swallow: this panel is decorative.
			}
			if (!cancelled) timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
		};
		void tick();
		return () => {
			cancelled = true;
			if (timer) clearTimeout(timer);
		};
	}, []);

	if (!status) return null;

	return (
		<div className='ai-index-status'>
			<h3 className='title'>{_('Embedding index')}</h3>
			<dl className='rows'>
				<dt>{_('Model:')}</dt>
				<dd>{modelStatusLabel(status.modelDownloadStatus)}</dd>
				<dt>{_('Indexer:')}</dt>
				<dd>{indexerStateLabel(status.indexerState)}</dd>
				<dt>{_('Indexed notes:')}</dt>
				<dd>{`${status.notesIndexed} / ${status.totalNotes}`}</dd>
			</dl>
		</div>
	);
};

export default AiIndexStatus;
