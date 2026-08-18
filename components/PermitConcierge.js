"use client";

import FullServicePermitStart from "./FullServicePermitStart";

export default function PermitConcierge({ project, user, permitCase, onPermitCaseUpdated }) {
  return (
    <FullServicePermitStart
      project={project}
      user={user}
      existingPermitCase={permitCase}
      compact
      onOpenDetails={() => {
        if (typeof onPermitCaseUpdated === "function" && permitCase) onPermitCaseUpdated(permitCase);
      }}
    />
  );
}
