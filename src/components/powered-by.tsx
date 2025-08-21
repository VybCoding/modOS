
const TechLogo = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center justify-center w-12 h-12 text-foreground/80">
        {children}
    </div>
)

export function PoweredBy() {
    return (
        <div>
            <h4 className="mb-4 text-sm font-medium tracking-widest text-center uppercase text-muted-foreground">Powered By</h4>
            <div className="flex items-center justify-center gap-8">
                    <TechLogo>
                    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Telegram</title><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.17.9-.501 1.13-1.09 1.145-.887.021-1.42-.382-2.208-.88-1.074-.685-1.68-1.102-2.69-1.76-1.274-.838-.455-1.28.28-2.03.18-.183 3.282-2.993 3.303-3.23.007-.08-.02-.15-.09-.2-.07-.05-.16-.03-.24 0-.1.03-1.685 1.11-4.75 3.337-.53.38-.97.5-1.42.48-.56-.02-1.58-.3-2.2-.565-.75-.295-1.33-.44-1.28-.9.03-.27.31-.54.89-.79 3.34-1.43 5.55-2.33 6.6-2.734 3.33-1.25 4.22-1.5 5.16-1.502z" fill="currentColor"/></svg>
                </TechLogo>
                <TechLogo>
                    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Google Cloud</title><path d="M12.012 21.43c-3.155 0-5.83-1.547-7.42-3.87l1.39-1.02c1.23 1.76 2.87 2.83 4.98 2.83 2.5 0 4.3-1.12 4.3-2.95 0-1.7-1.4-2.73-3.6-3.8l-1.05-.5c-2.92-1.4-4.85-2.73-4.85-5.63 0-2.81 2.22-4.95 5.17-4.95 2.5 0 4.45 1.25 5.68 3.15l-1.45 1c-1-1.45-2.43-2.2-4.22-2.2-1.9 0-3.25.93-3.25 2.38 0 1.58 1.23 2.45 3.12 3.35l1.05.5c3.5 1.63 5.37 2.98 5.37 5.95 0 3.35-2.6 5.1-6.14 5.1zM23.65 14.83c.03-.4.05-.8.05-1.2 0-.3-.02-.6-.05-1.03h-4.38v2.22h4.38zM24 12.03c0 .8-.08 1.58-.2 2.35-1.3 6.25-7.55 10.15-13.8 8.85s-10.15-7.55-8.85-13.8S8.7.48 15 .2c.4-.02.8-.05 1.2-.05.5 0 .98.02 1.48.08l4.42 4.42-2.65 2.63c-1.05-1.02-2.5-1.65-4.12-1.65-3.48 0-6.3 2.82-6.3 6.3s2.82 6.3 6.3 6.3c2.78 0 5.1-1.8 5.95-4.28h-3.75v-2.3h6.35z" fill="currentColor"/></svg>
                </TechLogo>
                    <TechLogo>
                    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Next.js</title><path d="M15.402 16.902L24 8.358V0l-8.598 8.544V24h8.598v-7.098zM8.544 0v15.456L0 24V8.544L8.544 0z" fill="currentColor"/></svg>
                </TechLogo>
            </div>
        </div>
    )
}
