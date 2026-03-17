## Work Orders

The Work Orders screen shows every maintenance job in the system and lets you track, assign, and update work.

### What this screen is for

The Work Orders screen tracks maintenance tasks that need to be completed.  
Each row represents one job with information such as status, priority, location, and who is assigned.

### Who typically uses it

Maintenance supervisors  
Dispatchers  
Technicians  
Operations managers  

### Key things you can do

• View all maintenance work in one list  
• Filter work by status, priority, technician, company, or location  
• Open any work order to see full details  
• Create new work orders  
• Update status, schedule, and assignments (when your role allows changes)  
• Export work orders to a file  

### Create a new work order

1. From the left sidebar, go to **Work Orders**.  
2. Click **New Work Order** in the top right.  
3. Enter a clear title and short description for the job.  
4. Choose the company, location, and asset (if known).  
5. Set the priority and assign a technician or crew if needed.  
6. Click **Create**.

### Layout overview

**Top bar**  
Shows the page title, quick actions, export tools, and the **New Work Order** button.

**Filters and saved views**  
Let you quickly focus on open work, overdue work, today’s work, or other common views.

**Main table**  
Each row is a work order and shows key information such as number, title, status, location, and assignment.  
Click a row to open details in a drawer or full page.

### Typical workflow

Request submitted  
→ Work order created  
→ Scheduled and assigned to a technician or crew  
→ Technician completes the work  
→ Work order closed and appears in reports  

### Tips

• Use clear, specific titles so work is easy to find later.  
• Keep statuses up to date so everyone sees an accurate picture of open and completed work.  
• Link work orders to the correct asset so maintenance history stays complete.  
• Use filters and saved views to quickly find the work that needs attention today.  

## Work Orders

### What this module is for

The Work Orders module tracks individual maintenance jobs that need to be done.  
Each work order describes a task, who will do it, and its current status.

### Who uses this module

Maintenance supervisors  
Dispatchers  
Technicians  
Operations managers

### When you would use this module

- Reviewing all open maintenance work  
- Checking what is assigned to each technician  
- Looking up the details of a specific job  
- Closing out work that has been completed

### Key things you can do here

- View a list of work orders at `/work-orders`  
- Search and filter by status, priority, technician, or other fields (as available)  
- Open a work order to see full details  
- Update fields such as status, schedule, or assignment (where actions are available)  
- Navigate to related assets, companies, and dispatch views

### Main screen overview

When you open **Work Orders** from the sidebar you land on `/work-orders`.  
You will see a table of work orders with key columns such as number, title, status, and assigned technician.  
Filters and search controls across the top help you focus on specific work, such as open jobs or work for a certain technician.

Clicking on a row opens the work order detail page at `/work-orders/[id]`, which shows:

- Main job details (title, description, priority)  
- Assignment and schedule information  
- Links to related asset, company, or request (where present)

### Step-by-step guide

#### Review today’s work orders

1. In the left sidebar, click **Work Orders**.  
2. Use any status filter to show open or active work.  
3. Scan the table to see which jobs are overdue or high priority.  
4. Click a work order number to open full details.

#### Check the details of a work order

1. From `/work-orders`, click the work order you want to inspect.  
2. Review the description, asset (if linked), and schedule.  
3. Note the assigned technician or crew, if shown.  
4. Use the available buttons on the page to update status or other fields, if your role allows changes.

### Common workflows

Work request submitted  
↓  
Work order created  
↓  
Work order scheduled and assigned  
↓  
Technician completes work  
↓  
Work order closed and appears in reports

### Tips and best practices

- Use clear, descriptive titles so work is easy to find later.  
- Keep status updated so everyone sees an accurate picture of what is open, in progress, or completed.  
- When possible, link work orders to assets so maintenance history stays connected.

### Related modules

Dispatch  
Assets  
Technicians  
Work Requests  
Reports

### Notes for demos or onboarding

- Start by showing the work order list and how to search for a specific job.  
- Open one work order and point out the key fields: title, priority, status, and assignment.  
- Mention that Work Orders connect to Dispatch (for scheduling) and to Assets (for history).

