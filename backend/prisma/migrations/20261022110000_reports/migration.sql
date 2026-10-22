CREATE TABLE "ReportRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "format" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportShare" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportShare_tokenHash_key" ON "ReportShare"("tokenHash");
CREATE INDEX "ReportRecord_userId_createdAt_idx" ON "ReportRecord"("userId", "createdAt");
CREATE INDEX "ReportShare_expiresAt_idx" ON "ReportShare"("expiresAt");

ALTER TABLE "ReportRecord" ADD CONSTRAINT "ReportRecord_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportShare" ADD CONSTRAINT "ReportShare_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "ReportRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
