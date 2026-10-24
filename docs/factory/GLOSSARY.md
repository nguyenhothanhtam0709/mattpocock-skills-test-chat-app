# Factory

The process that turns Tickets into pull requests on the Chat product, and the documents agents rely on while doing it.

## Language

**Ticket**:
A unit of work for one agent and one pull request, written as a Markdown file under a spec's `issues/` folder.
_Avoid_: Issue (the `issues/` folder keeps its name), task, story

**Intent Doc**:
A document that says why something is or what it should be; it outranks the code, so code that contradicts it is the defect.
_Avoid_: Spec doc, requirements doc

**Generated Doc**:
A document produced from the code by a script and never edited by hand; the code outranks it, so a mismatch means the doc is stale.
_Avoid_: Auto doc, derived doc

**Descriptive Doc**:
A hand-written document that says how something works today; the code outranks it, so a mismatch means the doc is the defect.
_Avoid_: Explanation, reference doc

**Laters**:
The single file where anyone notes work for a later MVP without widening their current Ticket.
_Avoid_: Backlog, TODO list
