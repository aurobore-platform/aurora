import fs from "node:fs";
import path from "node:path";

/** Исходная строка в qsTr() нативного QML (не web). */
export const NATIVE_APP_NAME_SOURCE = "AUROBORE_APP_NAME";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function messageBlock(
  qmlFile: string,
  line: number,
  source: string,
  translation: string,
): string {
  return `    <message>
        <location filename="../qml/${qmlFile}" line="${line}"/>
        <source>${escapeXml(source)}</source>
        <translation>${escapeXml(translation)}</translation>
    </message>`;
}

/** Минимальный .ts для splash/cover (одна строка — имя приложения). */
export function generateTsContent(options: {
  appName: string;
  language: string;
  /** Перевод; по умолчанию = appName (для базового en-файла). */
  translation?: string;
}): string {
  const { appName, language } = options;
  const translation = options.translation ?? appName;
  const source = NATIVE_APP_NAME_SOURCE;

  const contexts = [
    { name: "DefaultCover", file: "cover/DefaultCover.qml", lines: [9] },
    { name: "SplashScreen", file: "components/SplashScreen.qml", lines: [11, 28] },
  ];

  const contextBlocks = contexts
    .map(
      (ctx) => `    <context>
        <name>${ctx.name}</name>
${ctx.lines.map((line) => messageBlock(ctx.file, line, source, translation)).join("\n")}
    </context>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE TS>
<TS version="2.1" language="${escapeXml(language)}" sourcelanguage="en">
${contextBlocks}
</TS>
`;
}

/** Записывает translations/<appId>.ts и <appId>-ru.ts в native-проект. */
export function materializeTranslations(
  nativeDir: string,
  appId: string,
  appName: string,
): void {
  const dir = path.join(nativeDir, "translations");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${appId}.ts`),
    generateTsContent({ appName, language: "en" }),
    "utf8",
  );
  fs.writeFileSync(
    path.join(dir, `${appId}-ru.ts`),
    generateTsContent({ appName, language: "ru", translation: appName }),
    "utf8",
  );
}

/** Фрагмент CMake: lrelease для translations/*.ts (после find_package LinguistTools). */
export const CMAKE_TRANSLATIONS_BLOCK = `file(GLOB TsFiles "\${CMAKE_CURRENT_SOURCE_DIR}/translations/*.ts")
qt5_add_translation(QmFiles \${TsFiles})`;

export const CMAKE_TRANSLATIONS_INSTALL = `foreach(_qm IN LISTS QmFiles)
    install(FILES \${_qm} DESTINATION share/\${PROJECT_NAME}/translations)
endforeach()`;
