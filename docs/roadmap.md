# Feature roadmap and issue list

This is a living backlog. Items are recorded in the order raised; scheduling and implementation are pending.

| ID     | Feature / issue                                                             | Status  |
| ------ | --------------------------------------------------------------------------- | ------- |
| PT-001 | Focus mode: auto-advance on a correct result while keeping detection active | Backlog |

## PT-001 — Focus mode auto-advance

**Request:** Add an auto-advance option to focus mode that advances on a correct result and stays in detection mode.

**Expected behavior:** With the option enabled, a correct (in-range) result is recorded for the current student, the next student is selected, and detection continues without another press of Check.

**Acceptance criteria:**

- Focus mode offers an auto-advance toggle.
- A correct result advances to the next eligible student using the existing Next selection behavior, excluding absent students.
- Detection remains active for the newly selected student without requiring another press of Check.
- Low or high results do not advance to another student.
- Disabling auto-advance preserves the existing manual workflow.
- Each accepted result is recorded once against the student who produced it.

**Details to settle before implementation:**

- Whether manual correct scores also trigger auto-advance.
- Whether low/high results automatically re-arm detection for the same student.
- How to prevent the previous student's sustained tone from scoring the next student.
- What happens at the end of a roster or when only one eligible student remains.
- Whether the toggle resets each session or is remembered.

**Validation planned:** Exercise consecutive correct results, low/high results, absent students, the disabled option, duplicate-result prevention, and roster boundaries in the built HTML under offline file URLs. Check microphone transitions with real hardware as well.
