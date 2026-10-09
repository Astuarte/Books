const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');

const docsDir = path.join(__dirname, 'documents');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

function createPDF(filename, docTitle, subtitle, chapters) {
  const doc = new jsPDF({ unit: 'in', format: [8.5, 11] });

  chapters.forEach((chap, idx) => {
    if (idx > 0) doc.addPage([8.5, 11]);

    // Top Header Banner
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 8.5, 1.2, 'F');
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 1.15, 8.5, 0.05, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text(docTitle, 0.6, 0.5);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(203, 213, 225);
    doc.text(subtitle, 0.6, 0.85);

    // Section Ribbon
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(0.6, 1.5, 7.3, 0.4, 0.05, 0.05, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.text(chap.heading, 0.8, 1.75);

    let curY = 2.3;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);

    chap.content.forEach(p => {
      const lines = doc.splitTextToSize(p, 7.3);
      doc.text(lines, 0.6, curY);
      curY += (lines.length * 0.22) + 0.18;
    });

    // Box highlight
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(0.6, 7.6, 7.3, 2.0, 0.1, 0.1, 'FD');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(99, 102, 241);
    doc.text("LAW SCHOOL EXAM KEY TAKEAWAY — PAGE " + (idx + 1), 0.8, 7.9);

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(chap.takeaway, 0.8, 8.2, { maxWidth: 6.9 });

    // Footer
    doc.setDrawColor(203, 213, 225);
    doc.line(0.6, 10.2, 7.9, 10.2);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("School of Law Shared Repository | " + filename, 0.6, 10.4);
    doc.text("Page " + (idx + 1) + " of " + chapters.length, 7.9, 10.4, { align: 'right' });
  });

  const filePath = path.join(docsDir, filename);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(filePath, pdfBuffer);
  console.log("Created: " + filePath);
}

// PDF 1: Constitutional Law
createPDF(
  "Constitutional_Law_II_Lecture_Notes.pdf",
  "PHILIPPINE CONSTITUTIONAL LAW II",
  "Bill of Rights, Due Process & Fundamental Liberties",
  [
    {
      heading: "Module 1: Due Process of Law (Article III, Section 1)",
      content: [
        "No person shall be deprived of life, liberty, or property without due process of law, nor shall any person be denied the equal protection of the laws.",
        "Procedural Due Process requires notice, hearing, and an impartial tribunal with legal authority.",
        "Substantive Due Process ensures laws are reasonable, fair, and not arbitrary or oppressive."
      ],
      takeaway: "Always evaluate whether state action violates procedural guarantees (notice/hearing) or substantive limits (reasonableness)."
    },
    {
      heading: "Module 2: Search and Seizure Guarantees (Article III, Section 2)",
      content: [
        "The right of the people to be secure in their persons, houses, papers, and effects against unreasonable searches and seizures of whatever nature and for any purpose shall be inviolable.",
        "Exceptions to warrant requirement: Warrantless search incidental to lawful arrest, plain view doctrine, consented search, moving vehicle search, border customs search."
      ],
      takeaway: "Exclusionary Rule: Evidence obtained in violation of Section 2 is inadmissible for any purpose in any proceeding."
    },
    {
      heading: "Module 3: Freedom of Speech and Expression (Article III, Section 4)",
      content: [
        "No law shall be passed abridging the freedom of speech, of expression, or of the press, or the right of the people peaceably to assemble and petition the government for redress of grievances.",
        "Judicial Standards: Clear and Present Danger Test, Balancing of Interests Test, Dangerous Tendency Rule."
      ],
      takeaway: "Prior restraint bears a heavy presumption of unconstitutionality under Philippine constitutional jurisprudence."
    },
    {
      heading: "Module 4: Rights under Custodial Investigation (Article III, Section 12)",
      content: [
        "Any person under investigation for the commission of an offense shall have the right to be informed of his right to remain silent and to have competent and independent counsel preferably of his own choice.",
        "These rights cannot be waived except in writing and in the presence of counsel."
      ],
      takeaway: "Extrajudicial confessions made without assistance of counsel are completely inadmissible."
    },
    {
      heading: "Module 5: Rights of the Accused at Trial (Article III, Section 14)",
      content: [
        "In all criminal prosecutions, the accused shall be presumed innocent until the contrary is proved, and shall enjoy the right to be heard by himself and counsel.",
        "The right to meet witnesses face to face (Confrontation Clause) and to have compulsory process to secure attendance of witnesses."
      ],
      takeaway: "Proof beyond reasonable doubt is required for conviction in criminal proceedings."
    }
  ]
);

// PDF 2: Civil Law
createPDF(
  "Civil_Law_Landmark_Case_Digests.pdf",
  "CIVIL LAW & OBLIGATIONS CASE DIGESTS",
  "Selected Supreme Court Rulings & Statutory Notes",
  [
    {
      heading: "Title I: Obligations - Sources & Nature",
      content: [
        "Article 1156. An obligation is a juridical necessity to give, to do or not to do.",
        "Sources of Obligations: Law, Contracts, Quasi-contracts, Acts or omissions punished by law, Quasi-delicts.",
        "Landmark Case: Pelayo v. Lauron, 12 Phil. 453. Obligations derived from law are not presumed."
      ],
      takeaway: "Only those expressly determined in the Civil Code or special laws are demandable."
    },
    {
      heading: "Title II: Contracts - Essential Requisites",
      content: [
        "Article 1318. There is no contract unless the following requisites concur:",
        "1. Consent of the contracting parties;",
        "2. Object certain which is the subject matter of the contract;",
        "3. Cause of the obligation which is established."
      ],
      takeaway: "Absence of any essential requisite renders the contract void ab initio."
    },
    {
      heading: "Title III: Property & Ownership Rights",
      content: [
        "Article 427. Ownership may be exercised over things or rights.",
        "Rights of an Owner: Right to enjoy (jus utendi, jus fruendi, jus abutendi) and right to dispose (jus disponendi).",
        "Quieting of Title: Action brought to remove a cloud upon title to real property."
      ],
      takeaway: "Possession in good faith is equivalent to title under Article 559."
    },
    {
      heading: "Title IV: Torts and Damages (Article 2176)",
      content: [
        "Quasi-delict: Whoever by act or omission causes damage to another, there being fault or negligence, is obliged to pay for the damage done.",
        "Requisites: Damage suffered by plaintiff, Fault or negligence of defendant, Causal connection between fault and damage."
      ],
      takeaway: "Res Ipsa Loquitur doctrine applies when the accident speaks for itself."
    }
  ]
);

// PDF 3: Criminal Procedure
createPDF(
  "Criminal_Procedure_Reviewer.pdf",
  "CRIMINAL PROCEDURE COMPREHENSIVE REVIEWER",
  "Rules 110 to 127 of the Revised Rules of Criminal Procedure",
  [
    {
      heading: "Rule 110: Prosecution of Offenses",
      content: [
        "All criminal actions commenced by a complaint or information shall be prosecuted under the direction and control of the prosecutor.",
        "Sufficiency of Complaint or Information: Name of accused, Designation of offense, Acts or omissions complained of, Name of offended party, Approximate date and place of offense."
      ],
      takeaway: "Variance between allegation and proof is controlled by Rules 120, Sec 4."
    },
    {
      heading: "Rule 112: Preliminary Investigation",
      content: [
        "Preliminary investigation is an inquiry or proceeding to determine whether there is sufficient ground to engender a well-founded belief that a crime has been committed.",
        "Required for offenses punishable by at least 4 years, 2 months and 1 day."
      ],
      takeaway: "Probable cause for filing an information vs. probable cause for issuance of arrest warrant."
    },
    {
      heading: "Rule 113 & 114: Arrest and Bail",
      content: [
        "Arrest is the taking of a person into custody that he may be bound to answer for the commission of an offense.",
        "Bail: Security given for the release of a person in custody, conditioned upon his appearance before any court."
      ],
      takeaway: "Bail is a constitutional right except in capital offenses where evidence of guilt is strong."
    },
    {
      heading: "Rule 119: Trial Procedure & Demurrer to Evidence",
      content: [
        "Trial shall proceed in the following order: Prosecution presents evidence, Accused presents evidence, Rebuttal evidence.",
        "Demurrer to Evidence: Motion to dismiss filed by accused after prosecution rests its case based on insufficiency of evidence."
      ],
      takeaway: "Filing demurrer with leave of court preserves right to present defense evidence if denied."
    }
  ]
);

console.log("All 3 PDF documents successfully created in documents/ folder!");
