
package com.govbudget.management.ministrybudget.repository;

import com.govbudget.management.ministrybudget.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findByOfficeBudgetAllocationId(
            Long officeBudgetAllocationId);

    boolean existsByProjectCode(String projectCode);
}
