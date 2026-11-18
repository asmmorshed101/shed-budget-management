
import { useEffect, useRef, useState } from "react";
import { Download, FileText, FileDown, RefreshCw } from "lucide-react";
import api from "../api/axios";
import { loadActiveMinistryContext } from "../services/budgetContext";
import { saveAs } from "file-saver";
import html2pdf from "html2pdf.js";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const localDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const periodExpense = (history, from, to) => {
  const records = [...history].sort((a, b) =>
    String(a.reportDate).localeCompare(String(b.reportDate))
  );

  const closing = records
    .filter((item) => item.reportDate <= to)
    .at(-1);

  const opening = records
    .filter((item) => item.reportDate < from)
    .at(-1);

  return Math.max(
    Number(closing?.cumulativeAmount || 0) -
      Number(opening?.cumulativeAmount || 0),
    0
  );
};

const categoryLabel = (code, name) => {
  if (code === "OPERATIONAL") return "পরিচালন বাজেট";
  if (code === "SEDP") return "এসইডিপি";
  if (code === "DEVELOPMENT") return "উন্নয়ন বাজেট";
  return name || code;
};

export default function DownloadReports() {
  const reportRef = useRef(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(localDate(new Date()));
  const [activeFiscalYear, setActiveFiscalYear] = useState(null);

  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      // Resolve the active fiscal year dynamically from the database.
      const { activeFiscalYear: activeYear, ministry } =
        await loadActiveMinistryContext();

      if (!activeYear?.id) {
        throw new Error("কোনো Active Fiscal Year পাওয়া যায়নি।");
      }

      setActiveFiscalYear(activeYear);

      // Limit the report date range to the active fiscal year's dates.
      const today = localDate(new Date());
      const defaultFrom = activeYear.startDate;
      const defaultTo =
        today < activeYear.endDate ? today : activeYear.endDate;

      setFromDate(defaultFrom);
      setToDate(defaultTo >= defaultFrom ? defaultTo : activeYear.endDate);

      const budgetResponse = await api.get(
        "/ministry-budgets/by-fiscal-year",
        { params: { fiscalYearId: activeYear.id, organizationId: ministry.id } }
      );

      const budgetData = budgetResponse.data;
      const budget = Array.isArray(budgetData)
        ? budgetData[0]
        : budgetData;

      if (!budget?.id) {
        throw new Error("এই অর্থবছরের কোনো বাজেট পাওয়া যায়নি।");
      }

      const categoryResponse = await api.get(
        `/ministry-budgets/${budget.id}/categories`
      );

      const categoryList = getArray(categoryResponse.data);
      setCategories(categoryList);

      const orgResponse = await api.get("/organizations/hierarchy");
      const organizationMap = new Map();

      const flatten = (items) => {
        getArray(items).forEach((org) => {
          organizationMap.set(String(org.id), org);
          if (Array.isArray(org.children)) flatten(org.children);
        });
      };

      flatten(orgResponse.data);

      const result = [];

      for (const category of categoryList) {
        const code = category.categoryCode;

        if (
          !["OPERATIONAL", "SEDP", "DEVELOPMENT"].includes(code)
        ) {
          continue;
        }

        if (code === "SEDP") {
          result.push({
            id: `SEDP-${category.id}`,
            categoryCode: code,
            categoryName: categoryLabel(code, category.categoryName),
            sourceCode: "",
            sourceName: "—",
            officeName: "—",
            itemName: categoryLabel(code, category.categoryName),
            allocated: Number(category.totalAmount || 0),
            expenditure: null,
            type: "UNTRACKED",
          });
          continue;
        }

        const sourceResponse = await api.get(
          `/budget-categories/${category.id}/sources`
        );

        const sources = getArray(sourceResponse.data);

        for (const source of sources) {
          const isADP =
            code === "DEVELOPMENT" && source.sourceCode === "ADP";

          const isBlock =
            code === "DEVELOPMENT" && source.sourceCode === "BLOCK";

          const isOperational = code === "OPERATIONAL";

          if (!isADP && !isBlock && !isOperational) continue;

          const allocationResponse = await api.get(
            `/budget-sources/${source.id}/offices`
          );

          const allocations = getArray(allocationResponse.data);

          for (const allocation of allocations) {
            const office = organizationMap.get(
              String(allocation.organizationId)
            );

            const officeName =
              office?.nameBn ||
              office?.name ||
              `Office ${allocation.organizationId}`;

            if (isADP) {
              const projectResponse = await api.get(
                `/office-allocations/${allocation.id}/projects`
              );

              const projects = getArray(projectResponse.data);

              for (const project of projects) {
                const historyResponse = await api.get(
                  `/projects/${project.id}/expenditures`
                );

                result.push({
                  id: `PROJECT-${project.id}`,
                  categoryCode: code,
                  categoryName: categoryLabel(code, category.categoryName),
                  sourceCode: "ADP",
                  sourceName: "ADP",
                  officeName,
                  itemName:
                    project.projectNameBn || project.projectName,
                  allocated: Number(project.allocatedAmount || 0),
                  expenditure: periodExpense(
                    getArray(historyResponse.data),
                    fromDate,
                    toDate
                  ),
                  type: "PROJECT",
                });
              }
            } else {
              const historyResponse = await api.get(
                `/office-allocations/${allocation.id}/expenditures`
              );

              result.push({
                id: `OFFICE-${allocation.id}`,
                categoryCode: code,
                categoryName: categoryLabel(code, category.categoryName),
                sourceCode: source.sourceCode,
                sourceName: source.sourceCode,
                officeName,
                itemName: officeName,
                allocated: Number(allocation.allocatedAmount || 0),
                expenditure: periodExpense(
                  getArray(historyResponse.data),
                  fromDate,
                  toDate
                ),
                type: "OFFICE",
              });
            }
          }
        }
      }

      setRows(result);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "রিপোর্ট লোড করা যায়নি।"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categoryData = categories.map((category) => {
    const code = category.categoryCode;

    const matchingRows = rows.filter(
      (item) => item.categoryCode === code
    );

    const allocated =
      code === "SEDP"
        ? Number(category.totalAmount || 0)
        : Number(category.totalAmount || 0);

    const expenditure =
      code === "SEDP"
        ? null
        : matchingRows.reduce(
            (sum, item) => sum + Number(item.expenditure || 0),
            0
          );

    return {
      id: category.id,
      code,
      name: categoryLabel(code, category.categoryName),
      allocated,
      expenditure,
      remaining:
        expenditure === null ? null : allocated - expenditure,
    };
  });

  const developmentSources = ["ADP", "BLOCK"].map((sourceCode) => {
    const matchingRows = rows.filter(
      (item) =>
        item.categoryCode === "DEVELOPMENT" &&
        item.sourceCode === sourceCode
    );

    return {
      sourceCode,
      allocated: matchingRows.reduce(
        (sum, item) => sum + item.allocated,
        0
      ),
      expenditure: matchingRows.reduce(
        (sum, item) => sum + Number(item.expenditure || 0),
        0
      ),
    };
  });

  const totals = {
    budget: categoryData.reduce(
      (sum, item) => sum + item.allocated,
      0
    ),
    trackedAllocation: rows
      .filter((item) => item.type !== "UNTRACKED")
      .reduce((sum, item) => sum + item.allocated, 0),
    expenditure: rows.reduce(
      (sum, item) => sum + Number(item.expenditure || 0),
      0
    ),
  };

  const remaining =
    totals.trackedAllocation - totals.expenditure;

  const percent = (value, allocated) =>
    allocated > 0
      ? `${((value / allocated) * 100).toFixed(2)}%`
      : "—";

  const validDates = fromDate && toDate && fromDate <= toDate;

  // Create a Word document with the same report tables.
  const downloadWord = async () => {
    try {
      setDownloading("WORD");

      const border = {
        style: BorderStyle.SINGLE,
        size: 1,
        color: "64748B",
      };

      const borders = {
        top: border,
        bottom: border,
        left: border,
        right: border,
      };

      const cell = (value, bold = false) =>
        new TableCell({
          borders,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: String(value ?? ""),
                  bold,
                  font: "Noto Sans Bengali",
                  size: 20,
                }),
              ],
            }),
          ],
        });

      const makeRow = (values, bold = false) =>
        new TableRow({
          children: values.map((value) => cell(value, bold)),
        });

      const budgetRows = [
        makeRow(["বাজেট", "বরাদ্দকৃত অর্থ"], true),
        ...categoryData.map((item) =>
          makeRow([item.name, money(item.allocated)])
        ),
        makeRow(["সর্বমোট বাজেট", money(totals.budget)], true),
      ];

      const detailRows = [
        makeRow(
          [
            "বাজেট",
            "বরাদ্দকৃত অর্থ",
            "নির্বাচিত সময় পর্যন্ত ব্যয়",
            "অবশিষ্ট অর্থ",
            "অবশিষ্ট অর্থের হার",
          ],
          true
        ),
        ...categoryData.map((item) =>
          makeRow([
            item.name,
            money(item.allocated),
            item.expenditure === null
              ? "ব্যয়ের তথ্য নেই"
              : money(item.expenditure),
            item.remaining === null
              ? "হিসাব করা যায়নি"
              : money(item.remaining),
            item.remaining === null
              ? "—"
              : percent(item.remaining, item.allocated),
          ])
        ),
        ...developmentSources.map((item) =>
          makeRow([
            `উন্নয়ন বাজেট — ${item.sourceCode}`,
            money(item.allocated),
            money(item.expenditure),
            money(item.allocated - item.expenditure),
            percent(
              item.allocated - item.expenditure,
              item.allocated
            ),
          ])
        ),
        makeRow(
          [
            "ট্র্যাককৃত ব্যয়ের সর্বমোট",
            money(totals.trackedAllocation),
            money(totals.expenditure),
            money(remaining),
            percent(remaining, totals.trackedAllocation),
          ],
          true
        ),
      ];

      const officeRows = [
        makeRow(
          [
            "অফিস",
            "বাজেট",
            "উৎস",
            "বরাদ্দ",
            "নির্বাচিত সময়ের ব্যয়",
          ],
          true
        ),
        ...rows
          .filter((item) => item.type !== "UNTRACKED")
          .map((item) =>
            makeRow([
              item.officeName,
              item.categoryName,
              item.sourceName,
              money(item.allocated),
              money(item.expenditure),
            ])
          ),
      ];

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: { orientation: "landscape" },
                margin: {
                  top: 700,
                  bottom: 700,
                  left: 700,
                  right: 700,
                },
              },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "মাধ্যমিক ও উচ্চ শিক্ষা বিভাগের বাজেট প্রতিবেদন",
                    bold: true,
                    font: "Noto Sans Bengali",
                    size: 30,
                  }),
                ],
                spacing: { after: 120 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `প্রতিবেদনকাল: ${fromDate} থেকে ${toDate}`,
                    font: "Noto Sans Bengali",
                    size: 22,
                  }),
                ],
                spacing: { after: 300 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "বাজেটের সারসংক্ষেপ (অঙ্কসমূহ টাকা)",
                    bold: true,
                    font: "Noto Sans Bengali",
                    size: 24,
                  }),
                ],
                spacing: { after: 120 },
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: budgetRows,
              }),
              new Paragraph({ text: "", spacing: { after: 200 } }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "বাজেট বাস্তবায়ন প্রতিবেদন (অঙ্কসমূহ টাকা)",
                    bold: true,
                    font: "Noto Sans Bengali",
                    size: 24,
                  }),
                ],
                spacing: { after: 120 },
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: detailRows,
              }),
              new Paragraph({ text: "", spacing: { after: 200 } }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "অফিসভিত্তিক বিস্তারিত ব্যয়",
                    bold: true,
                    font: "Noto Sans Bengali",
                    size: 24,
                  }),
                ],
                spacing: { after: 120 },
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: officeRows,
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text:
                      "দ্রষ্টব্য: SEDP-এর ব্যয়ের তথ্য বর্তমান সিস্টেমে সংরক্ষিত নেই; তাই এই অংশের ব্যয় ও অবশিষ্ট অর্থ হিসাব করা হয়নি।",
                    font: "Noto Sans Bengali",
                    size: 18,
                  }),
                ],
                spacing: { before: 200 },
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);

      saveAs(
        blob,
        `SHED-Budget-Report-${fromDate}-to-${toDate}.docx`
      );
    } catch (err) {
      setError("Word ফাইল তৈরি করা যায়নি: " + err.message);
    } finally {
      setDownloading("");
    }
  };

  // PDF is rendered from the Bengali HTML report.
  const downloadPdf = async () => {
    try {
      setDownloading("PDF");

      if (!reportRef.current) {
        throw new Error("Report content not found.");
      }

      await document.fonts.ready;

      await html2pdf()
        .set({
          margin: [10, 8, 10, 8],
          filename: `SHED-Budget-Report-${fromDate}-to-${toDate}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "landscape",
          },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(reportRef.current)
        .save();
    } catch (err) {
      setError("PDF ফাইল তৈরি করা যায়নি: " + err.message);
    } finally {
      setDownloading("");
    }
  };

  const styles = {
    page: {
      padding: "24px",
      maxWidth: "1450px",
      margin: "0 auto",
    },
    card: {
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "20px",
    },
    input: {
      padding: "10px",
      border: "1px solid #cbd5e1",
      borderRadius: "7px",
    },
    button: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      padding: "11px 17px",
      border: 0,
      borderRadius: "7px",
      color: "#fff",
      fontWeight: 600,
      cursor: "pointer",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "650px",
    },
    th: {
      border: "1px solid #64748b",
      padding: "12px 8px",
      textAlign: "center",
      background: "#f1f5f9",
      fontSize: "13px",
    },
    td: {
      border: "1px solid #94a3b8",
      padding: "11px 8px",
      textAlign: "center",
      fontSize: "13px",
    },
  };

  if (loading) {
    return <div style={styles.page}>রিপোর্টের তথ্য লোড হচ্ছে...</div>;
  }

  return (
    <div style={styles.page}>
      <h1 style={{ fontSize: "25px", marginBottom: "6px" }}>
        Download Reports
      </h1>
      <p style={{ color: "#64748b", marginBottom: "22px" }}>
        সরকারি বাজেট প্রতিবেদনের ফরম্যাটে Word অথবা PDF ডাউনলোড করুন।
      </p>

      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>রিপোর্টের সময় নির্বাচন</h3>

        <div
          style={{
            display: "flex",
            gap: "14px",
            flexWrap: "wrap",
            alignItems: "end",
          }}
        >
          <div>
            <label>From Date</label>
            <br />
            <input
              type="date"
              style={styles.input}
              value={fromDate}
              min={activeFiscalYear?.startDate || undefined}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label>To Date</label>
            <br />
            <input
              type="date"
              style={styles.input}
              value={toDate}
              min={fromDate}
              max={activeFiscalYear?.endDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <button
            style={{ ...styles.button, background: "#475569" }}
            onClick={loadData}
            disabled={loading || !validDates}
          >
            <RefreshCw size={17} /> Refresh Report
          </button>

          <button
            style={{ ...styles.button, background: "#166534" }}
            onClick={downloadWord}
            disabled={!validDates || !!downloading}
          >
            <FileText size={17} />
            {downloading === "WORD" ? "Preparing Word..." : "Download Word"}
          </button>

          <button
            style={{ ...styles.button, background: "#b91c1c" }}
            onClick={downloadPdf}
            disabled={!validDates || !!downloading}
          >
            <FileDown size={17} />
            {downloading === "PDF" ? "Preparing PDF..." : "Download PDF"}
          </button>
        </div>

        {!validDates && (
          <p style={{ color: "#b91c1c" }}>
            From Date অবশ্যই To Date-এর সমান বা আগের হতে হবে।
          </p>
        )}

        {error && (
          <p style={{ color: "#b91c1c", marginBottom: 0 }}>{error}</p>
        )}
      </div>

      <div
        ref={reportRef}
        style={{
          background: "#fff",
          padding: "28px",
          color: "#111827",
          fontFamily:
            '"Noto Sans Bengali", "SolaimanLipi", "Arial", sans-serif',
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: "22px",
            marginBottom: "8px",
          }}
        >
          {activeFiscalYear?.name || ""} অর্থবছরের মাধ্যমিক ও উচ্চ শিক্ষা বিভাগের বাজেট
        </h2>

        <p style={{ textAlign: "center", marginBottom: "22px" }}>
          (অঙ্কসমূহ টাকা)
        </p>

        <div style={{ maxWidth: "720px", margin: "0 auto 35px" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>বাজেট</th>
                <th style={styles.th}>বরাদ্দকৃত অর্থ</th>
              </tr>
            </thead>
            <tbody>
              {categoryData.map((item) => (
                <tr key={item.id}>
                  <td style={styles.td}>{item.name}</td>
                  <td style={styles.td}>{money(item.allocated)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...styles.td, fontWeight: 700 }}>
                  সর্বমোট বাজেট
                </td>
                <td style={{ ...styles.td, fontWeight: 700 }}>
                  {money(totals.budget)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 style={{ textAlign: "center", fontSize: "20px" }}>
          {fromDate} থেকে {toDate} পর্যন্ত বাজেট বাস্তবায়ন প্রতিবেদন
        </h2>
        <p style={{ textAlign: "center", marginBottom: "20px" }}>
          (অঙ্কসমূহ টাকা)
        </p>

        <table style={{ ...styles.table, marginBottom: "25px" }}>
          <thead>
            <tr>
              <th style={styles.th}>বাজেট</th>
              <th style={styles.th}>বরাদ্দকৃত অর্থ</th>
              <th style={styles.th}>নির্বাচিত সময় পর্যন্ত ব্যয়</th>
              <th style={styles.th}>অবশিষ্ট অর্থের পরিমাণ</th>
              <th style={styles.th}>অবশিষ্ট অর্থের শতকরা হার (%)</th>
            </tr>
          </thead>
          <tbody>
            {categoryData.map((item) => (
              <tr key={item.id}>
                <td style={styles.td}>{item.name}</td>
                <td style={styles.td}>{money(item.allocated)}</td>
                <td style={styles.td}>
                  {item.expenditure === null
                    ? "ব্যয়ের তথ্য নেই"
                    : money(item.expenditure)}
                </td>
                <td style={styles.td}>
                  {item.remaining === null
                    ? "হিসাব করা যায়নি"
                    : money(item.remaining)}
                </td>
                <td style={styles.td}>
                  {item.remaining === null
                    ? "—"
                    : percent(item.remaining, item.allocated)}
                </td>
              </tr>
            ))}

            {developmentSources.map((item) => (
              <tr key={item.sourceCode}>
                <td style={styles.td}>
                  উন্নয়ন বাজেট — {item.sourceCode}
                </td>
                <td style={styles.td}>{money(item.allocated)}</td>
                <td style={styles.td}>{money(item.expenditure)}</td>
                <td style={styles.td}>
                  {money(item.allocated - item.expenditure)}
                </td>
                <td style={styles.td}>
                  {percent(
                    item.allocated - item.expenditure,
                    item.allocated
                  )}
                </td>
              </tr>
            ))}

            <tr>
              <td style={{ ...styles.td, fontWeight: 700 }}>
                ট্র্যাককৃত ব্যয়ের সর্বমোট
              </td>
              <td style={styles.td}>
                {money(totals.trackedAllocation)}
              </td>
              <td style={styles.td}>{money(totals.expenditure)}</td>
              <td style={styles.td}>{money(remaining)}</td>
              <td style={styles.td}>
                {percent(remaining, totals.trackedAllocation)}
              </td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ textAlign: "center", marginTop: "25px" }}>
          অফিসভিত্তিক বিস্তারিত ব্যয়
        </h3>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>অফিস</th>
              <th style={styles.th}>বাজেট</th>
              <th style={styles.th}>উৎস</th>
              <th style={styles.th}>বরাদ্দ</th>
              <th style={styles.th}>নির্বাচিত সময়ের ব্যয়</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((item) => item.type !== "UNTRACKED")
              .map((item) => (
                <tr key={item.id}>
                  <td style={styles.td}>{item.officeName}</td>
                  <td style={styles.td}>{item.categoryName}</td>
                  <td style={styles.td}>{item.sourceName}</td>
                  <td style={styles.td}>{money(item.allocated)}</td>
                  <td style={styles.td}>{money(item.expenditure)}</td>
                </tr>
              ))}
          </tbody>
        </table>

        <p style={{ fontSize: "12px", marginTop: "18px" }}>
          দ্রষ্টব্য: SEDP-এর ব্যয়ের তথ্য বর্তমান সিস্টেমে সংরক্ষিত নেই।
          তাই SEDP-এর ব্যয় ও অবশিষ্ট অর্থের হিসাব করা হয়নি।
        </p>
      </div>
    </div>
  );
}
