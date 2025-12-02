-- 复杂查询：公用表表达式(CTE)测试用例
-- 问题描述：复杂CTE使用，包括递归CTE、多层CTE、CTE与窗口函数结合等

-- 1. 基本CTE使用
WITH dept_stats AS (
    SELECT
        department_id,
        COUNT(*) as employee_count,
        AVG(salary) as avg_salary,
        SUM(salary) as total_salary
    FROM employees
    GROUP BY department_id
)
SELECT
    d.name as department_name,
    ds.employee_count,
    ds.avg_salary,
    ds.total_salary
FROM departments d
JOIN dept_stats ds ON d.id = ds.department_id;

-- 2. 多层CTE嵌套
WITH dept_summary AS (
    SELECT
        department_id,
        COUNT(*) as employee_count,
        AVG(salary) as avg_salary
    FROM employees
    GROUP BY department_id
),
high_salary_depts AS (
    SELECT department_id
    FROM dept_summary
    WHERE avg_salary > 50000
)
SELECT
    d.name,
    ds.avg_salary,
    ds.employee_count
FROM departments d
JOIN dept_summary ds ON d.id = ds.department_id
JOIN high_salary_depts hsd ON d.id = hsd.department_id;

-- 3. 递归CTE - 层级数据
WITH RECURSIVE employee_hierarchy AS (
    -- Base case: top-level managers (no manager)
    SELECT
        id,
        name,
        manager_id,
        1 as level,
        CAST(name AS VARCHAR(1000)) as path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive case: employees under their managers
    SELECT
        e.id,
        e.name,
        e.manager_id,
        eh.level + 1,
        CONCAT(eh.path, ' > ', e.name) as path
    FROM employees e
    JOIN employee_hierarchy eh ON e.manager_id = eh.id
)
SELECT
    eh.id,
    eh.name,
    eh.level,
    eh.path,
    m.name as manager_name
FROM employee_hierarchy eh
LEFT JOIN employees m ON eh.manager_id = m.id
ORDER BY eh.path;

-- 4. 递归CTE - 产品分类树
WITH RECURSIVE category_tree AS (
    -- Base case: top-level categories
    SELECT
        id,
        name,
        parent_id,
        0 as depth,
        CAST(name AS VARCHAR(255)) as full_path
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    -- Recursive case: subcategories
    SELECT
        c.id,
        c.name,
        c.parent_id,
        ct.depth + 1,
        CONCAT(ct.full_path, ' > ', c.name) as full_path
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT
    ct.id,
    ct.name,
    ct.depth,
    ct.full_path,
    COUNT(p.id) as product_count
FROM category_tree ct
LEFT JOIN products p ON ct.id = p.category_id
GROUP BY ct.id, ct.name, ct.depth, ct.full_path
ORDER BY ct.full_path;

-- 5. CTE与聚合函数结合
WITH monthly_sales AS (
    SELECT
        DATE_FORMAT(order_date, '%Y-%m') as month,
        customer_id,
        SUM(amount) as monthly_amount,
        COUNT(*) as order_count
    FROM orders
    GROUP BY DATE_FORMAT(order_date, '%Y-%m'), customer_id
),
customer_summary AS (
    SELECT
        customer_id,
        COUNT(*) as active_months,
        SUM(monthly_amount) as total_amount,
        AVG(monthly_amount) as avg_monthly_amount,
        MAX(monthly_amount) as best_month_amount
    FROM monthly_sales
    GROUP BY customer_id
)
SELECT
    cs.customer_id,
    c.name as customer_name,
    cs.active_months,
    cs.total_amount,
    cs.avg_monthly_amount,
    cs.best_month_amount,
    CASE
        WHEN cs.active_months >= 12 THEN 'Loyal'
        WHEN cs.active_months >= 6 THEN 'Regular'
        ELSE 'New'
    END as loyalty_status
FROM customer_summary cs
JOIN customers c ON cs.customer_id = c.id;

-- 6. CTE用于数据清洗和转换
WITH raw_data AS (
    SELECT
        id,
        TRIM(name) as cleaned_name,
        LOWER(TRIM(email)) as cleaned_email,
        CASE
            WHEN age < 0 THEN NULL
            WHEN age > 120 THEN NULL
            ELSE age
        END as validated_age,
        created_at
    FROM users_import
),
deduplicated AS (
    SELECT
        cleaned_name,
        cleaned_email,
        validated_age,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY cleaned_email ORDER BY created_at DESC) as rn
    FROM raw_data
    WHERE cleaned_email IS NOT NULL
)
SELECT
    cleaned_name,
    cleaned_email,
    validated_age,
    created_at
FROM deduplicated
WHERE rn = 1;

-- 7. CTE用于复杂业务逻辑计算
WITH customer_metrics AS (
    SELECT
        customer_id,
        COUNT(DISTINCT order_id) as order_count,
        SUM(amount) as total_spent,
        AVG(amount) as avg_order_value,
        MAX(order_date) as last_order_date,
        MIN(order_date) as first_order_date
    FROM orders
    GROUP BY customer_id
),
rfm_analysis AS (
    SELECT
        customer_id,
        order_count,
        total_spent,
        avg_order_value,
        last_order_date,
        first_order_date,
        DATEDIFF(CURRENT_DATE, last_order_date) as recency_days,
        NTILE(5) OVER (ORDER BY DATEDIFF(CURRENT_DATE, last_order_date)) as recency_score,
        NTILE(5) OVER (ORDER BY order_count DESC) as frequency_score,
        NTILE(5) OVER (ORDER BY total_spent DESC) as monetary_score
    FROM customer_metrics
)
SELECT
    customer_id,
    c.name as customer_name,
    order_count,
        total_spent,
    recency_days,
    recency_score,
    frequency_score,
    monetary_score,
    recency_score + frequency_score + monetary_score as rfm_score,
    CASE
        WHEN recency_score + frequency_score + monetary_score >= 12 THEN 'Champions'
        WHEN recency_score + frequency_score + monetary_score >= 9 THEN 'Loyal Customers'
        WHEN recency_score + frequency_score + monetary_score >= 6 THEN 'Potential Loyalist'
        WHEN recency_score >= 4 AND frequency_score <= 2 THEN 'New Customers'
        WHEN recency_score <= 2 AND frequency_score >= 4 THEN 'At Risk'
        ELSE 'Others'
    END as customer_segment
FROM rfm_analysis r
JOIN customers c ON r.customer_id = c.id;

-- 8. CTE用于时间序列分析
WITH daily_metrics AS (
    SELECT
        DATE(order_date) as order_date,
        COUNT(*) as order_count,
        SUM(amount) as daily_revenue,
        AVG(amount) as avg_order_value
    FROM orders
    GROUP BY DATE(order_date)
),
moving_averages AS (
    SELECT
        order_date,
        order_count,
        daily_revenue,
        avg_order_value,
        AVG(daily_revenue) OVER (
            ORDER BY order_date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as revenue_7day_ma,
        AVG(order_count) OVER (
            ORDER BY order_date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as orders_7day_ma
    FROM daily_metrics
)
SELECT
    order_date,
    order_count,
    daily_revenue,
    avg_order_value,
    revenue_7day_ma,
    orders_7day_ma,
    (daily_revenue - revenue_7day_ma) / revenue_7day_ma * 100 as revenue_deviation_pct,
    (order_count - orders_7day_ma) / orders_7day_ma * 100 as orders_deviation_pct
FROM moving_averages
ORDER BY order_date;

-- 9. CTE用于复杂条件筛选
WITH product_performance AS (
    SELECT
        product_id,
        COUNT(*) as sales_count,
        SUM(amount) as total_revenue,
        AVG(amount) as avg_price,
        MAX(order_date) as last_sale_date
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    GROUP BY product_id
),
slow_moving_products AS (
    SELECT
        product_id,
        total_revenue,
        sales_count,
        last_sale_date
    FROM product_performance
    WHERE last_sale_date < DATE_SUB(CURRENT_DATE, INTERVAL 90 DAY)
        AND sales_count < 10
        AND total_revenue < 1000
)
SELECT
    p.name as product_name,
    p.category,
    smp.total_revenue,
    smp.sales_count,
    smp.last_sale_date,
    DATEDIFF(CURRENT_DATE, smp.last_sale_date) as days_since_last_sale,
    'Recommend Discontinuation' as recommendation
FROM slow_moving_products smp
JOIN products p ON smp.product_id = p.id;

-- 10. CTE用于复杂的报表查询
WITH regional_sales AS (
    SELECT
        r.region_name,
        p.product_category,
        SUM(oi.quantity * oi.unit_price) as revenue,
        COUNT(DISTINCT o.id) as order_count,
        COUNT(DISTINCT o.customer_id) as customer_count
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    JOIN customers c ON o.customer_id = c.id
    JOIN regions r ON c.region_id = r.id
    WHERE o.order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
    GROUP BY r.region_name, p.product_category
),
regional_totals AS (
    SELECT
        region_name,
        SUM(revenue) as total_revenue,
        SUM(order_count) as total_orders,
        SUM(customer_count) as total_customers
    FROM regional_sales
    GROUP BY region_name
)
SELECT
    rs.region_name,
    rs.product_category,
    rs.revenue,
    rs.order_count,
    rs.customer_count,
    rt.total_revenue,
    (rs.revenue / rt.total_revenue) * 100 as revenue_percentage,
    (rs.order_count / rt.total_orders) * 100 as order_percentage,
    (rs.customer_count / rt.total_customers) * 100 as customer_percentage
FROM regional_sales rs
JOIN regional_totals rt ON rs.region_name = rt.region_name
ORDER BY rs.region_name, rs.revenue DESC;