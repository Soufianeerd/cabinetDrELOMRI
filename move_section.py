import re

with open("index.html", "r") as f:
    content = f.read()

# The section we want to move
faq_pattern = re.compile(r'(  <!-- 8\. FAQ -->\n  <section class="section" id="faq".*?</section>\n)', re.DOTALL)

# Find the faq block
faq_match = faq_pattern.search(content)
if not faq_match:
    print("Could not find FAQ section")
    exit(1)

faq_block = faq_match.group(1)

# Remove faq block from the content
content = content[:faq_match.start()] + content[faq_match.end():]

# Find the end of the contact section
contact_pattern = re.compile(r'(  <!-- 10\. CONTACT / SMART FORM -->\n  <section class="section" id="contact".*?</section>\n)', re.DOTALL)

contact_match = contact_pattern.search(content)
if not contact_match:
    print("Could not find Contact section")
    exit(1)

# Insert faq block immediately after contact block
insert_pos = contact_match.end()

# Let's change the background colors to maintain alternation
# Contact is #fff
# FAQ should become var(--color-bg)
# Infos pratiques should become #fff

faq_block = faq_block.replace('style="background:#fff;"', 'style="background:var(--color-bg);"')
content = content.replace('<section class="section" id="informations-pratiques" style="background:var(--color-bg);">', '<section class="section" id="informations-pratiques" style="background:#fff;">')

new_content = content[:insert_pos] + '\n' + faq_block + content[insert_pos:]

with open("index.html", "w") as f:
    f.write(new_content)

print("Moved FAQ section successfully.")
