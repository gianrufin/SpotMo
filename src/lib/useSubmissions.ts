import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { Submission, SubmissionStatus, SpotEvent } from '../types';

const KEY = 'spotmo.submissions';

export function useSubmissions() {
  const [submissions, setSubmissions] = useLocalStorage<Submission[]>(KEY, []);

  const add = useCallback(
    (event: SpotEvent, submittedBy: string) => {
      const submission: Submission = {
        ...event,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        submittedBy,
      };
      setSubmissions((prev) => [submission, ...prev]);
      return submission;
    },
    [setSubmissions],
  );

  const setStatus = useCallback(
    (id: string, status: SubmissionStatus) => {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s)),
      );
    },
    [setSubmissions],
  );

  const remove = useCallback(
    (id: string) => {
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    },
    [setSubmissions],
  );

  const update = useCallback(
    (id: string, patch: Partial<SpotEvent>) => {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
    },
    [setSubmissions],
  );

  const bulkSetStatus = useCallback(
    (ids: string[], status: SubmissionStatus) => {
      const idSet = new Set(ids);
      setSubmissions((prev) =>
        prev.map((s) => (idSet.has(s.id) ? { ...s, status } : s)),
      );
    },
    [setSubmissions],
  );

  const bulkRemove = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      setSubmissions((prev) => prev.filter((s) => !idSet.has(s.id)));
    },
    [setSubmissions],
  );

  const approved = submissions.filter((s) => s.status === 'approved');

  return { submissions, approved, add, setStatus, remove, update, bulkSetStatus, bulkRemove };
}
