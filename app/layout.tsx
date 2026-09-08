import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
export const metadata:Metadata={title:'Book Club Briefing · Admin',description:'Local editorial workspace for Book Club Briefing V1.1.'};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en"><body>{children}</body></html>;}
