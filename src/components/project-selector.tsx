'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './auth-provider';
import { useRouter } from 'next/navigation';
import { Skeleton } from './ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

type Project = {
  id: string;
  name: string;
};

export function ProjectSelector() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      if (!user) return;

      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/projects', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }

        const data: Project[] = await response.json();
        setProjects(data);

        if (data.length === 1) {
          router.push(`/dashboard/${data[0].id}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-16 w-80" />
          <Skeleton className="h-16 w-80" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        Error: {error}
      </div>
    );
  }

  if (projects.length > 1) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Select a Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => router.push(`/dashboard/${project.id}`)}
                className="w-full p-4 text-left bg-white dark:bg-gray-800 rounded-lg shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {project.name}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (projects.length === 0 && !loading) {
      return (
        <div className="flex items-center justify-center h-screen">
            <p>You are not an administrator of any projects.</p>
        </div>
      )
  }

  return null;
}
