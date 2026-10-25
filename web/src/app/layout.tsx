import type { Metadata } from "next";
import { Suspense } from "react";

import { I18nProvider } from "@/components/i18n/I18nProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { getDataSource } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.app.name, description: t.app.description };
}

// Applies a saved light/dark choice before paint to avoid a flash.
const themeScript = `try{var t=localStorage.getItem("rmi-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getI18n();
  const source = getDataSource().name;
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/* Browser extensions often add attributes to <body> before React loads; ignore those diffs (one level deep only). */}
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <I18nProvider locale={locale}>
          <div className="flex min-h-screen flex-col md:flex-row">
            <Suspense>
              <Sidebar source={source} />
            </Suspense>
            <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
