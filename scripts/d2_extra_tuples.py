# 14 additional Domain 2 tuples (question, correct, explain) — completes 80 with existing 66
D2_EXTRA: list[tuple[str, str, str]] = [
    ("Need-to-know access means:", "Users receive access only to data required for their assigned duties", "Least privilege limits scope; need-to-know is narrower than role alone."),
    ("A clean desk policy primarily reduces:", "Visual exposure of sensitive information in workspaces", "Complements classification and visitor controls."),
    ("Controlled unclassified information (CUI) handling requires:", "Consistent marking, dissemination limits, and safeguarding per policy", "US federal contractors often map to NIST SP 800-171."),
    ("Proprietary data labels signal:", "Business-sensitive information that should not leave the organization", "Not the same as national security classification but still protected."),
    ("Secure courier transport of media should include:", "Chain of custody, sealed packaging, and authorized recipients", "Reduces interception and tampering."),
    ("USB device controls often combine:", "Technical blocks or encryption with policy and user awareness", "Whitelisting may be needed for operational exceptions."),
    ("eDiscovery readiness benefits from:", "Consistent retention, legal hold processes, and indexed storage", "Poor retention complicates litigation and increases cost."),
    ("Data masking differs from tokenization in that masking:", "Often preserves format while hiding real values for testing or display", "Tokenization replaces with unrelated surrogate values."),
    ("Synthetic test data is preferred because:", "It avoids copying real customer information into lower environments", "Reduces privacy and confidentiality exposure."),
    ("Secure print (pull printing) helps:", "Ensure documents release only when the user authenticates at the device", "Prevents sensitive pages sitting on shared trays."),
    ("Classification downgrade should:", "Follow approved procedures and re-marking when sensitivity changes", "Prevents outdated high labels that block sharing."),
    ("Media reuse between sensitivity levels should:", "Be avoided or sanitized to the higher level’s requirements first", "Lower-to-higher reuse risks data spillage."),
    ("Privacy by default suggests:", "Systems should minimize collection and visibility of personal data by default", "Aligns with GDPR-style data protection by design."),
    ("Secure disposal of optical media may require:", "Physical destruction when purge is not assured", "CD/DVD data can resist simple scratching."),
]
